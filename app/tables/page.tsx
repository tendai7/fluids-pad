"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_TABLES } from "@/lib/references";

// ─── Data ────────────────────────────────────────────────────────────────────

// a = speed of sound in water (m/s) from ASHRAE data — note peak ~74°C
const waterProperties = [
  { T: 0,   rho: 999.8, mu: 1.792, nu: 1.792, k: 0.5610, cp: 4218, Pr: 13.47, sigma: 0.0757, a: 1407 },
  { T: 5,   rho: 999.9, mu: 1.519, nu: 1.519, k: 0.5710, cp: 4202, Pr: 11.19, sigma: 0.0749, a: 1426 },
  { T: 10,  rho: 999.7, mu: 1.307, nu: 1.307, k: 0.5800, cp: 4192, Pr:  9.46, sigma: 0.0742, a: 1447 },
  { T: 20,  rho: 998.2, mu: 1.002, nu: 1.004, k: 0.5980, cp: 4182, Pr:  7.01, sigma: 0.0728, a: 1482 },
  { T: 30,  rho: 995.6, mu: 0.798, nu: 0.801, k: 0.6150, cp: 4179, Pr:  5.42, sigma: 0.0712, a: 1509 },
  { T: 40,  rho: 992.2, mu: 0.653, nu: 0.658, k: 0.6310, cp: 4179, Pr:  4.32, sigma: 0.0696, a: 1529 },
  { T: 50,  rho: 988.1, mu: 0.547, nu: 0.553, k: 0.6440, cp: 4181, Pr:  3.55, sigma: 0.0679, a: 1543 },
  { T: 60,  rho: 983.2, mu: 0.467, nu: 0.475, k: 0.6540, cp: 4184, Pr:  2.99, sigma: 0.0662, a: 1551 },
  { T: 70,  rho: 977.7, mu: 0.404, nu: 0.413, k: 0.6630, cp: 4190, Pr:  2.55, sigma: 0.0644, a: 1555 },
  { T: 80,  rho: 971.8, mu: 0.355, nu: 0.365, k: 0.6700, cp: 4196, Pr:  2.22, sigma: 0.0626, a: 1554 },
  { T: 90,  rho: 965.3, mu: 0.315, nu: 0.326, k: 0.6750, cp: 4205, Pr:  1.96, sigma: 0.0608, a: 1550 },
  { T: 100, rho: 958.4, mu: 0.282, nu: 0.294, k: 0.6790, cp: 4216, Pr:  1.75, sigma: 0.0589, a: 1543 },
];

const airProperties = [
  { T: -50, rho: 1.582, mu: 1.462, nu: 0.924, k: 0.02035, cp: 1005, Pr: 0.725 },
  { T:   0, rho: 1.293, mu: 1.716, nu: 1.327, k: 0.02416, cp: 1005, Pr: 0.715 },
  { T:  20, rho: 1.204, mu: 1.813, nu: 1.506, k: 0.02551, cp: 1005, Pr: 0.713 },
  { T:  40, rho: 1.127, mu: 1.906, nu: 1.692, k: 0.02756, cp: 1005, Pr: 0.711 },
  { T:  60, rho: 1.060, mu: 1.997, nu: 1.884, k: 0.02856, cp: 1005, Pr: 0.709 },
  { T:  80, rho: 0.999, mu: 2.087, nu: 2.088, k: 0.02991, cp: 1009, Pr: 0.708 },
  { T: 100, rho: 0.946, mu: 2.174, nu: 2.298, k: 0.03095, cp: 1009, Pr: 0.703 },
  { T: 150, rho: 0.834, mu: 2.377, nu: 2.850, k: 0.03374, cp: 1017, Pr: 0.699 },
  { T: 200, rho: 0.746, mu: 2.570, nu: 3.444, k: 0.03653, cp: 1025, Pr: 0.694 },
  { T: 300, rho: 0.616, mu: 2.934, nu: 4.762, k: 0.04153, cp: 1044, Pr: 0.700 },
  { T: 400, rho: 0.524, mu: 3.265, nu: 6.231, k: 0.04640, cp: 1069, Pr: 0.753 },
];

const pipeRoughness = [
  { material: "Drawn copper, brass, glass", roughness: "0.0015 (smooth)" },
  { material: "Commercial steel / wrought iron", roughness: "0.046" },
  { material: "Galvanised iron", roughness: "0.15" },
  { material: "Cast iron", roughness: "0.26" },
  { material: "Concrete (smooth)", roughness: "0.3 – 1.0" },
  { material: "Concrete (rough)", roughness: "1.0 – 3.0" },
  { material: "Riveted steel", roughness: "0.9 – 9.0" },
  { material: "PVC / Plastic (new)", roughness: "0.0015 (smooth)" },
  { material: "Stainless steel (new)", roughness: "0.015" },
  { material: "Asphalt-dipped cast iron", roughness: "0.12" },
];

const minorLosses = [
  { fitting: "Sharp-edged pipe entrance",        K: "0.50" },
  { fitting: "Re-entrant (projecting) entrance",  K: "0.80" },
  { fitting: "Well-rounded entrance",             K: "0.04" },
  { fitting: "Sharp-edged exit (to reservoir)",   K: "1.00" },
  { fitting: "Sudden expansion",                  K: "(1 − A₁/A₂)²" },
  { fitting: "Globe valve (fully open)",          K: "~10" },
  { fitting: "Gate valve (fully open)",           K: "0.2" },
  { fitting: "Gate valve (½ open)",               K: "5.6" },
  { fitting: "Ball valve (fully open)",           K: "0.05" },
  { fitting: "Check valve (swing)",               K: "2.3" },
  { fitting: "90° elbow (standard)",              K: "0.9" },
  { fitting: "90° elbow (long radius)",           K: "0.4" },
  { fitting: "45° elbow",                         K: "0.4" },
  { fitting: "Tee (flow through branch)",         K: "1.8" },
  { fitting: "Tee (flow in line)",                K: "0.4" },
  { fitting: "Strainer",                          K: "~2.0" },
];

const commonFluids = [
  { fluid: "Water (20°C)",       rho: 998,    mu: "1.002×10⁻³", nu: "1.004×10⁻⁶", Pv: 2.34,    gamma: "—" },
  { fluid: "Seawater (20°C)",    rho: 1025,   mu: "1.07×10⁻³",  nu: "1.04×10⁻⁶",  Pv: 2.34,    gamma: "—" },
  { fluid: "Air (20°C, 1 atm)",  rho: 1.204,  mu: "1.81×10⁻⁵",  nu: "1.51×10⁻⁵",  Pv: "—",     gamma: "1.40" },
  { fluid: "Hydrogen",           rho: 0.0838, mu: "8.96×10⁻⁶",  nu: "1.07×10⁻⁴",  Pv: "—",     gamma: "1.41" },
  { fluid: "SAE 10W oil (20°C)", rho: 870,    mu: "0.104",       nu: "1.20×10⁻⁴",  Pv: "—",     gamma: "—" },
  { fluid: "SAE 30 oil (20°C)",  rho: 917,    mu: "0.290",       nu: "3.16×10⁻⁴",  Pv: "—",     gamma: "—" },
  { fluid: "Glycerine (20°C)",   rho: 1260,   mu: "1.49",        nu: "1.18×10⁻³",  Pv: "~0",    gamma: "—" },
  { fluid: "Mercury (20°C)",     rho: 13550,  mu: "1.55×10⁻³",  nu: "1.14×10⁻⁷",  Pv: 0.00173, gamma: "—" },
  { fluid: "Ethanol (20°C)",     rho: 789,    mu: "1.20×10⁻³",  nu: "1.52×10⁻⁶",  Pv: 5.9,     gamma: "—" },
  { fluid: "Benzene (20°C)",     rho: 879,    mu: "0.65×10⁻³",  nu: "0.74×10⁻⁶",  Pv: 10.0,    gamma: "—" },
];

const manningsRoughness = [
  { channel: "PVC / HDPE pipe",                       n: "0.011", range: "0.009–0.013" },
  { channel: "Concrete flume (smooth float finish)",  n: "0.012", range: "0.011–0.013" },
  { channel: "Concrete (ordinary finish)",            n: "0.013", range: "0.012–0.014" },
  { channel: "Concrete (rough finish)",               n: "0.017", range: "0.015–0.020" },
  { channel: "Cast iron / ductile iron pipe",         n: "0.013", range: "0.012–0.014" },
  { channel: "Corrugated metal pipe",                 n: "0.024", range: "0.021–0.030" },
  { channel: "Brick with cement mortar",              n: "0.015", range: "0.013–0.017" },
  { channel: "Earth canal (clean, straight)",         n: "0.022", range: "0.018–0.025" },
  { channel: "Gravel bed, clean",                     n: "0.025", range: "0.020–0.030" },
  { channel: "Grass / pasture (short)",               n: "0.030", range: "0.025–0.035" },
  { channel: "Natural channel (clean, straight)",     n: "0.030", range: "0.025–0.035" },
  { channel: "Natural channel (winding, some pools)", n: "0.040", range: "0.033–0.050" },
  { channel: "Natural channel (weedy, deep pools)",   n: "0.060", range: "0.050–0.080" },
  { channel: "Floodplain (light brush / trees)",      n: "0.060", range: "0.050–0.080" },
];

const isaAtmosphere = [
  { alt: "0",  T: "288.15", P: "101.33", rho: "1.2250", a: "340.3" },
  { alt: "1",  T: "281.65", P: "89.88",  rho: "1.1120", a: "336.4" },
  { alt: "2",  T: "275.15", P: "79.50",  rho: "1.0070", a: "332.5" },
  { alt: "3",  T: "268.66", P: "70.12",  rho: "0.9090", a: "328.6" },
  { alt: "4",  T: "262.17", P: "61.66",  rho: "0.8190", a: "324.6" },
  { alt: "5",  T: "255.68", P: "54.05",  rho: "0.7360", a: "320.5" },
  { alt: "6",  T: "249.19", P: "47.22",  rho: "0.6600", a: "316.5" },
  { alt: "8",  T: "236.22", P: "35.65",  rho: "0.5260", a: "308.1" },
  { alt: "10", T: "223.25", P: "26.50",  rho: "0.4140", a: "299.5" },
  { alt: "12", T: "216.65", P: "19.40",  rho: "0.3120", a: "295.1" },
  { alt: "15", T: "216.65", P: "12.11",  rho: "0.1948", a: "295.1" },
  { alt: "20", T: "216.65", P: "5.475",  rho: "0.0880", a: "295.1" },
];

// μ = Mach angle (°) = arcsin(1/M), only exists for M≥1
// ν = Prandtl-Meyer expansion angle (°), only exists for M≥1
const isentropicFlow = [
  { M: "0.1", TT0: "0.9980", PP0: "0.9930",   rr0: "0.9950",   AAst: "5.822",  mu: "—",    nu: "—" },
  { M: "0.2", TT0: "0.9921", PP0: "0.9725",   rr0: "0.9803",   AAst: "2.964",  mu: "—",    nu: "—" },
  { M: "0.3", TT0: "0.9823", PP0: "0.9395",   rr0: "0.9564",   AAst: "2.035",  mu: "—",    nu: "—" },
  { M: "0.4", TT0: "0.9690", PP0: "0.8956",   rr0: "0.9243",   AAst: "1.590",  mu: "—",    nu: "—" },
  { M: "0.5", TT0: "0.9524", PP0: "0.8430",   rr0: "0.8852",   AAst: "1.340",  mu: "—",    nu: "—" },
  { M: "0.6", TT0: "0.9328", PP0: "0.7840",   rr0: "0.8405",   AAst: "1.188",  mu: "—",    nu: "—" },
  { M: "0.7", TT0: "0.9107", PP0: "0.7209",   rr0: "0.7916",   AAst: "1.094",  mu: "—",    nu: "—" },
  { M: "0.8", TT0: "0.8852", PP0: "0.6560",   rr0: "0.7400",   AAst: "1.038",  mu: "—",    nu: "—" },
  { M: "0.9", TT0: "0.8606", PP0: "0.5913",   rr0: "0.6870",   AAst: "1.009",  mu: "—",    nu: "—" },
  { M: "1.0", TT0: "0.8333", PP0: "0.5283",   rr0: "0.6339",   AAst: "1.000",  mu: "90.00", nu: "0.00" },
  { M: "1.2", TT0: "0.7764", PP0: "0.4124",   rr0: "0.5311",   AAst: "1.030",  mu: "56.44", nu: "3.56" },
  { M: "1.4", TT0: "0.7184", PP0: "0.3142",   rr0: "0.4374",   AAst: "1.115",  mu: "45.58", nu: "8.99" },
  { M: "1.6", TT0: "0.6614", PP0: "0.2353",   rr0: "0.3557",   AAst: "1.250",  mu: "38.68", nu: "14.86" },
  { M: "1.8", TT0: "0.6068", PP0: "0.1740",   rr0: "0.2868",   AAst: "1.439",  mu: "33.75", nu: "20.73" },
  { M: "2.0", TT0: "0.5556", PP0: "0.1278",   rr0: "0.2300",   AAst: "1.688",  mu: "30.00", nu: "26.38" },
  { M: "2.5", TT0: "0.4444", PP0: "0.05853",  rr0: "0.1317",   AAst: "2.637",  mu: "23.58", nu: "39.12" },
  { M: "3.0", TT0: "0.3571", PP0: "0.02722",  rr0: "0.07623",  AAst: "4.235",  mu: "19.47", nu: "49.76" },
  { M: "4.0", TT0: "0.2381", PP0: "0.006586", rr0: "0.02766",  AAst: "10.72",  mu: "14.48", nu: "65.78" },
  { M: "5.0", TT0: "0.1667", PP0: "0.001890", rr0: "0.01134",  AAst: "25.00",  mu: "11.54", nu: "76.92" },
];

// Denser table: every 0.1 Mach step M=1.0–5.0 (source: exact γ=1.4 relations)
const normalShock = [
  { M1: "1.0", M2: "1.0000", PP: "1.000",  TT: "1.000", rr: "1.000", P0: "1.0000" },
  { M1: "1.1", M2: "0.9118", PP: "1.245",  TT: "1.065", rr: "1.169", P0: "0.9989" },
  { M1: "1.2", M2: "0.8422", PP: "1.513",  TT: "1.128", rr: "1.342", P0: "0.9928" },
  { M1: "1.3", M2: "0.7860", PP: "1.805",  TT: "1.191", rr: "1.516", P0: "0.9794" },
  { M1: "1.4", M2: "0.7397", PP: "2.120",  TT: "1.255", rr: "1.690", P0: "0.9582" },
  { M1: "1.5", M2: "0.7011", PP: "2.458",  TT: "1.320", rr: "1.862", P0: "0.9298" },
  { M1: "1.6", M2: "0.6684", PP: "2.820",  TT: "1.388", rr: "2.032", P0: "0.8952" },
  { M1: "1.7", M2: "0.6405", PP: "3.205",  TT: "1.458", rr: "2.198", P0: "0.8557" },
  { M1: "1.8", M2: "0.6165", PP: "3.613",  TT: "1.532", rr: "2.359", P0: "0.8127" },
  { M1: "1.9", M2: "0.5956", PP: "4.045",  TT: "1.608", rr: "2.516", P0: "0.7674" },
  { M1: "2.0", M2: "0.5774", PP: "4.500",  TT: "1.688", rr: "2.667", P0: "0.7209" },
  { M1: "2.1", M2: "0.5613", PP: "4.978",  TT: "1.770", rr: "2.812", P0: "0.6742" },
  { M1: "2.2", M2: "0.5471", PP: "5.480",  TT: "1.857", rr: "2.952", P0: "0.6281" },
  { M1: "2.3", M2: "0.5344", PP: "6.005",  TT: "1.947", rr: "3.085", P0: "0.5833" },
  { M1: "2.4", M2: "0.5231", PP: "6.553",  TT: "2.040", rr: "3.212", P0: "0.5401" },
  { M1: "2.5", M2: "0.5130", PP: "7.125",  TT: "2.138", rr: "3.333", P0: "0.4990" },
  { M1: "2.6", M2: "0.5039", PP: "7.720",  TT: "2.238", rr: "3.449", P0: "0.4601" },
  { M1: "2.7", M2: "0.4956", PP: "8.338",  TT: "2.343", rr: "3.559", P0: "0.4236" },
  { M1: "2.8", M2: "0.4882", PP: "8.980",  TT: "2.451", rr: "3.663", P0: "0.3895" },
  { M1: "2.9", M2: "0.4814", PP: "9.645",  TT: "2.563", rr: "3.762", P0: "0.3577" },
  { M1: "3.0", M2: "0.4752", PP: "10.333", TT: "2.679", rr: "3.857", P0: "0.3283" },
  { M1: "3.1", M2: "0.4695", PP: "11.045", TT: "2.799", rr: "3.946", P0: "0.3012" },
  { M1: "3.2", M2: "0.4643", PP: "11.780", TT: "2.922", rr: "4.032", P0: "0.2762" },
  { M1: "3.3", M2: "0.4596", PP: "12.538", TT: "3.049", rr: "4.112", P0: "0.2533" },
  { M1: "3.4", M2: "0.4552", PP: "13.320", TT: "3.180", rr: "4.188", P0: "0.2322" },
  { M1: "3.5", M2: "0.4512", PP: "14.125", TT: "3.315", rr: "4.261", P0: "0.2129" },
  { M1: "3.6", M2: "0.4474", PP: "14.953", TT: "3.454", rr: "4.329", P0: "0.1953" },
  { M1: "3.7", M2: "0.4439", PP: "15.805", TT: "3.596", rr: "4.396", P0: "0.1792" },
  { M1: "3.8", M2: "0.4407", PP: "16.680", TT: "3.743", rr: "4.456", P0: "0.1645" },
  { M1: "3.9", M2: "0.4377", PP: "17.578", TT: "3.893", rr: "4.515", P0: "0.1510" },
  { M1: "4.0", M2: "0.4350", PP: "18.500", TT: "4.047", rr: "4.572", P0: "0.1388" },
  { M1: "4.1", M2: "0.4324", PP: "19.445", TT: "4.205", rr: "4.625", P0: "0.1276" },
  { M1: "4.2", M2: "0.4299", PP: "20.413", TT: "4.367", rr: "4.675", P0: "0.1173" },
  { M1: "4.3", M2: "0.4277", PP: "21.405", TT: "4.532", rr: "4.724", P0: "0.1080" },
  { M1: "4.4", M2: "0.4255", PP: "22.420", TT: "4.702", rr: "4.769", P0: "0.0995" },
  { M1: "4.5", M2: "0.4236", PP: "23.458", TT: "4.875", rr: "4.812", P0: "0.0917" },
  { M1: "4.6", M2: "0.4217", PP: "24.520", TT: "5.052", rr: "4.854", P0: "0.0846" },
  { M1: "4.7", M2: "0.4199", PP: "25.605", TT: "5.233", rr: "4.892", P0: "0.0781" },
  { M1: "4.8", M2: "0.4183", PP: "26.713", TT: "5.418", rr: "4.931", P0: "0.0721" },
  { M1: "4.9", M2: "0.4167", PP: "27.845", TT: "5.607", rr: "4.965", P0: "0.0667" },
  { M1: "5.0", M2: "0.4152", PP: "29.000", TT: "5.800", rr: "5.000", P0: "0.0617" },
];

// Fanno flow: adiabatic duct flow with friction (γ = 1.4)
// * = sonic (choked) reference; 4fL*/D = friction parameter
const fannoFlow = [
  { M: "0.1", TT: "1.1976", PP: "10.944", VV: "0.1094", P0: "5.822",  fLD: "66.92" },
  { M: "0.2", TT: "1.1905", PP: "5.455",  VV: "0.2182", P0: "2.964",  fLD: "14.53" },
  { M: "0.3", TT: "1.1788", PP: "3.619",  VV: "0.3257", P0: "2.035",  fLD: "5.299" },
  { M: "0.4", TT: "1.1628", PP: "2.696",  VV: "0.4313", P0: "1.590",  fLD: "2.309" },
  { M: "0.5", TT: "1.1429", PP: "2.138",  VV: "0.5345", P0: "1.340",  fLD: "1.069" },
  { M: "0.6", TT: "1.1194", PP: "1.763",  VV: "0.6348", P0: "1.188",  fLD: "0.4908" },
  { M: "0.7", TT: "1.0929", PP: "1.494",  VV: "0.7318", P0: "1.094",  fLD: "0.2081" },
  { M: "0.8", TT: "1.0638", PP: "1.289",  VV: "0.8251", P0: "1.038",  fLD: "0.0723" },
  { M: "0.9", TT: "1.0327", PP: "1.129",  VV: "0.9146", P0: "1.009",  fLD: "0.0145" },
  { M: "1.0", TT: "1.0000", PP: "1.000",  VV: "1.0000", P0: "1.000",  fLD: "0" },
  { M: "1.2", TT: "0.9317", PP: "0.8044", VV: "1.1583", P0: "1.030",  fLD: "0.0336" },
  { M: "1.4", TT: "0.8621", PP: "0.6632", VV: "1.2999", P0: "1.115",  fLD: "0.0997" },
  { M: "1.6", TT: "0.7937", PP: "0.5568", VV: "1.4254", P0: "1.250",  fLD: "0.1724" },
  { M: "1.8", TT: "0.7282", PP: "0.4741", VV: "1.5360", P0: "1.439",  fLD: "0.2419" },
  { M: "2.0", TT: "0.6667", PP: "0.4082", VV: "1.6330", P0: "1.688",  fLD: "0.3050" },
  { M: "2.5", TT: "0.5333", PP: "0.2921", VV: "1.8257", P0: "2.637",  fLD: "0.4320" },
  { M: "3.0", TT: "0.4286", PP: "0.2182", VV: "1.9640", P0: "4.235",  fLD: "0.5222" },
  { M: "4.0", TT: "0.2857", PP: "0.1336", VV: "2.1381", P0: "10.72",  fLD: "0.6331" },
  { M: "5.0", TT: "0.2000", PP: "0.0894", VV: "2.2361", P0: "25.00",  fLD: "0.6938" },
];

// Rayleigh flow: constant-area duct with heat addition (γ = 1.4)
// * = sonic (maximum heat addition) reference; T0/T0* shows heat addition limit
const rayleighFlow = [
  { M: "0.1", TT: "0.05602", PP: "2.3669", T0: "0.0468", P0: "1.2591", VV: "0.0237" },
  { M: "0.2", TT: "0.20661", PP: "2.2727", T0: "0.1736", P0: "1.2346", VV: "0.0909" },
  { M: "0.3", TT: "0.40887", PP: "2.1314", T0: "0.3469", P0: "1.1985", VV: "0.1918" },
  { M: "0.4", TT: "0.61515", PP: "1.9608", T0: "0.5290", P0: "1.1566", VV: "0.3137" },
  { M: "0.5", TT: "0.79012", PP: "1.7778", T0: "0.6914", P0: "1.1141", VV: "0.4444" },
  { M: "0.6", TT: "0.91670", PP: "1.5957", T0: "0.8189", P0: "1.0753", VV: "0.5745" },
  { M: "0.7", TT: "0.99290", PP: "1.4235", T0: "0.9085", P0: "1.0431", VV: "0.6975" },
  { M: "0.8", TT: "1.02548", PP: "1.2658", T0: "0.9639", P0: "1.0193", VV: "0.8101" },
  { M: "0.9", TT: "1.02452", PP: "1.1246", T0: "0.9921", P0: "1.0049", VV: "0.9110" },
  { M: "1.0", TT: "1.00000", PP: "1.0000", T0: "1.0000", P0: "1.0000", VV: "1.0000" },
  { M: "1.2", TT: "0.91185", PP: "0.7958", T0: "0.9787", P0: "1.0194", VV: "1.1459" },
  { M: "1.4", TT: "0.80539", PP: "0.6410", T0: "0.9343", P0: "1.0777", VV: "1.2564" },
  { M: "1.6", TT: "0.70174", PP: "0.5236", T0: "0.8842", P0: "1.1756", VV: "1.3403" },
  { M: "1.8", TT: "0.60894", PP: "0.4335", T0: "0.8363", P0: "1.3159", VV: "1.4046" },
  { M: "2.0", TT: "0.52893", PP: "0.3636", T0: "0.7934", P0: "1.5031", VV: "1.4545" },
  { M: "2.5", TT: "0.37870", PP: "0.2462", T0: "0.7101", P0: "2.2218", VV: "1.5385" },
  { M: "3.0", TT: "0.28028", PP: "0.1765", T0: "0.6540", P0: "3.4245", VV: "1.5882" },
  { M: "4.0", TT: "0.16831", PP: "0.1026", T0: "0.5891", P0: "8.2268", VV: "1.6410" },
  { M: "5.0", TT: "0.11111", PP: "0.0667", T0: "0.5556", P0: "18.634", VV: "1.6667" },
];

// Numeric copies used only for interpolation
const isaNumeric = isaAtmosphere.map((r) => ({
  alt: parseFloat(r.alt), T: parseFloat(r.T),
  P: parseFloat(r.P), rho: parseFloat(r.rho), a: parseFloat(r.a),
}));
const isentropicNumeric = isentropicFlow.map((r) => ({
  M: parseFloat(r.M), TT0: parseFloat(r.TT0), PP0: parseFloat(r.PP0),
  rr0: parseFloat(r.rr0), AAst: parseFloat(r.AAst),
}));
const normalShockNumeric = normalShock.map((r) => ({
  M1: parseFloat(r.M1), M2: parseFloat(r.M2), PP: parseFloat(r.PP),
  TT: parseFloat(r.TT), rr: parseFloat(r.rr), P0: parseFloat(r.P0),
}));
const fannoNumeric = fannoFlow.map((r) => ({
  M: parseFloat(r.M), TT: parseFloat(r.TT), PP: parseFloat(r.PP),
  VV: parseFloat(r.VV), P0: parseFloat(r.P0), fLD: parseFloat(r.fLD),
}));
const rayleighNumeric = rayleighFlow.map((r) => ({
  M: parseFloat(r.M), TT: parseFloat(r.TT), PP: parseFloat(r.PP),
  T0: parseFloat(r.T0), P0: parseFloat(r.P0), VV: parseFloat(r.VV),
}));

// ─── Navigation structure ────────────────────────────────────────────────────

type Tab =
  | "water" | "air" | "fluids"
  | "roughness" | "losses"
  | "mannings"
  | "isa" | "isentropic" | "shock" | "fanno" | "rayleigh";

const navCategories = [
  {
    name: "Fluid Properties",
    tables: [
      { id: "water" as Tab,  label: "Water Properties" },
      { id: "air" as Tab,    label: "Air Properties" },
      { id: "fluids" as Tab, label: "Common Fluids" },
    ],
  },
  {
    name: "Pipe & Duct Systems",
    tables: [
      { id: "roughness" as Tab, label: "Pipe Roughness ε" },
      { id: "losses" as Tab,    label: "Minor Loss K" },
    ],
  },
  {
    name: "Open Channel Flow",
    tables: [
      { id: "mannings" as Tab, label: "Manning's n" },
    ],
  },
  {
    name: "Compressible Flow",
    tables: [
      { id: "isa" as Tab,        label: "ISA Atmosphere" },
      { id: "isentropic" as Tab, label: "Isentropic Flow" },
      { id: "shock" as Tab,      label: "Normal Shock" },
      { id: "fanno" as Tab,      label: "Fanno Flow" },
      { id: "rayleigh" as Tab,   label: "Rayleigh Flow" },
    ],
  },
];

const allTabs = navCategories.flatMap((c) => c.tables);

// ─── CSV generator ───────────────────────────────────────────────────────────

function q(v: string | number) {
  const s = String(v);
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function generateCSV(ids: Tab[]): string {
  const parts: string[] = [];

  for (const id of ids) {
    const label = allTabs.find((t) => t.id === id)?.label ?? id;
    parts.push(`# ${label}`);

    switch (id) {
      case "water":
        parts.push(["T (°C)", "rho (kg/m3)", "mu (mPa·s)", "nu (1e-6 m2/s)", "k (W/mK)", "cp (J/kgK)", "Pr", "sigma (N/m)", "a (m/s)"].map(q).join(","));
        waterProperties.forEach((r) => parts.push([r.T, r.rho, r.mu, r.nu, r.k, r.cp, r.Pr, r.sigma, r.a].map(q).join(",")));
        break;
      case "air":
        parts.push(["T (°C)", "rho (kg/m3)", "mu (1e-5 Pa·s)", "nu (1e-5 m2/s)", "k (W/mK)", "cp (J/kgK)", "Pr"].map(q).join(","));
        airProperties.forEach((r) => parts.push([r.T, r.rho, r.mu, r.nu, r.k, r.cp, r.Pr].map(q).join(",")));
        break;
      case "fluids":
        parts.push(["Fluid", "rho (kg/m3)", "mu (Pa·s)", "nu (m2/s)", "Pv (kPa)", "gamma"].map(q).join(","));
        commonFluids.forEach((r) => parts.push([r.fluid, r.rho, r.mu, r.nu, r.Pv, r.gamma].map(q).join(",")));
        break;
      case "roughness":
        parts.push(["Material", "eps (mm)"].map(q).join(","));
        pipeRoughness.forEach((r) => parts.push([r.material, r.roughness].map(q).join(",")));
        break;
      case "losses":
        parts.push(["Fitting", "K"].map(q).join(","));
        minorLosses.forEach((r) => parts.push([r.fitting, r.K].map(q).join(",")));
        break;
      case "mannings":
        parts.push(["Channel / Material", "n (typical)", "n (range)"].map(q).join(","));
        manningsRoughness.forEach((r) => parts.push([r.channel, r.n, r.range].map(q).join(",")));
        break;
      case "isa":
        parts.push(["Alt (km)", "T (K)", "P (kPa)", "rho (kg/m3)", "a (m/s)"].map(q).join(","));
        isaAtmosphere.forEach((r) => parts.push([r.alt, r.T, r.P, r.rho, r.a].map(q).join(",")));
        break;
      case "isentropic":
        parts.push(["M", "T/T0", "P/P0", "rho/rho0", "A/Astar", "mu_deg", "nu_deg"].map(q).join(","));
        isentropicFlow.forEach((r) => parts.push([r.M, r.TT0, r.PP0, r.rr0, r.AAst, r.mu, r.nu].map(q).join(",")));
        break;
      case "shock":
        parts.push(["M1", "M2", "P2/P1", "T2/T1", "rho2/rho1", "P02/P01"].map(q).join(","));
        normalShock.forEach((r) => parts.push([r.M1, r.M2, r.PP, r.TT, r.rr, r.P0].map(q).join(",")));
        break;
      case "fanno":
        parts.push(["M", "T/T*", "P/P*", "V/V*=rho*/rho", "P0/P0*", "4fL*/D"].map(q).join(","));
        fannoFlow.forEach((r) => parts.push([r.M, r.TT, r.PP, r.VV, r.P0, r.fLD].map(q).join(",")));
        break;
      case "rayleigh":
        parts.push(["M", "T/T*", "P/P*", "T0/T0*", "P0/P0*", "V/V*=rho*/rho"].map(q).join(","));
        rayleighFlow.forEach((r) => parts.push([r.M, r.TT, r.PP, r.T0, r.P0, r.VV].map(q).join(",")));
        break;
    }
    parts.push("");
  }

  return parts.join("\n");
}

function triggerFileDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Interpolation panel ─────────────────────────────────────────────────────

interface InterpCol { key: string; label: string }

function InterpolationPanel({
  varName, unit, xKey, data, columns,
}: {
  varName: string; unit: string; xKey: string;
  data: Record<string, number>[]; columns: InterpCol[];
}) {
  const [input, setInput] = useState("");

  const x = parseFloat(input);
  const isNum = input.trim() !== "" && !isNaN(x);

  const sorted = [...data].sort((a, b) => a[xKey] - b[xKey]);
  const tableMin = sorted[0]?.[xKey];
  const tableMax = sorted[sorted.length - 1]?.[xKey];

  let lo: Record<string, number> | null = null;
  let hi: Record<string, number> | null = null;
  let result: Record<string, number> | null = null;
  let warning: string | null = null;

  if (isNum) {
    if (x < tableMin) {
      warning = `Below table range (min ${tableMin} ${unit})`;
    } else if (x > tableMax) {
      warning = `Above table range (max ${tableMax} ${unit})`;
    } else {
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i][xKey] <= x && sorted[i + 1][xKey] >= x) {
          lo = sorted[i]; hi = sorted[i + 1]; break;
        }
      }
      if (lo && hi) {
        const t = lo[xKey] === hi[xKey] ? 0 : (x - lo[xKey]) / (hi[xKey] - lo[xKey]);
        result = {};
        for (const col of columns) {
          result[col.key] = lo[col.key] + t * (hi[col.key] - lo[col.key]);
        }
      }
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Interpolate at {varName}
        </span>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="enter value"
          className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
      </div>
      {warning && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{warning}</p>
      )}
      {result && lo && hi && (
        <>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2.5">
            {columns.map((col) => (
              <div key={col.key}>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{col.label}</p>
                <p className="font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm">
                  {result![col.key].toPrecision(4)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-gray-400 dark:text-gray-500">
            Linear interpolation between {varName} = {lo[xKey]} and {hi[xKey]}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Print section per table ─────────────────────────────────────────────────

function PrintTableSection({ id }: { id: Tab }) {
  switch (id) {
    case "water":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Water Properties (at 1 atm)</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr>{["T(°C)","ρ(kg/m³)","μ(mPa·s)","ν(×10⁻⁶m²/s)","k(W/mK)","cₚ(J/kgK)","Pr","σ(N/m)","a(m/s)"].map(h=><th key={h} className="border px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
            <tbody>{waterProperties.map(r=><tr key={r.T}><td className="border px-2 py-0.5">{r.T}</td><td className="border px-2 py-0.5">{r.rho}</td><td className="border px-2 py-0.5">{r.mu}</td><td className="border px-2 py-0.5">{r.nu}</td><td className="border px-2 py-0.5">{r.k}</td><td className="border px-2 py-0.5">{r.cp}</td><td className="border px-2 py-0.5">{r.Pr}</td><td className="border px-2 py-0.5">{r.sigma}</td><td className="border px-2 py-0.5">{r.a}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "air":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Air Properties (at 1 atm)</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr>{["T(°C)","ρ(kg/m³)","μ(×10⁻⁵Pa·s)","ν(×10⁻⁵m²/s)","k(W/mK)","cₚ(J/kgK)","Pr"].map(h=><th key={h} className="border px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
            <tbody>{airProperties.map(r=><tr key={r.T}><td className="border px-2 py-0.5">{r.T}</td><td className="border px-2 py-0.5">{r.rho}</td><td className="border px-2 py-0.5">{r.mu}</td><td className="border px-2 py-0.5">{r.nu}</td><td className="border px-2 py-0.5">{r.k}</td><td className="border px-2 py-0.5">{r.cp}</td><td className="border px-2 py-0.5">{r.Pr}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "fluids":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Common Fluid Properties</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr>{["Fluid","ρ(kg/m³)","μ(Pa·s)","ν(m²/s)","Pᵥ(kPa)","γ"].map(h=><th key={h} className="border px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
            <tbody>{commonFluids.map(r=><tr key={r.fluid}><td className="border px-2 py-0.5">{r.fluid}</td><td className="border px-2 py-0.5">{r.rho}</td><td className="border px-2 py-0.5 font-mono">{r.mu}</td><td className="border px-2 py-0.5 font-mono">{r.nu}</td><td className="border px-2 py-0.5">{r.Pv}</td><td className="border px-2 py-0.5">{r.gamma}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "roughness":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Pipe Roughness ε (mm)</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr><th className="border px-2 py-1 bg-gray-100 text-left">Material</th><th className="border px-2 py-1 bg-gray-100">ε (mm)</th></tr></thead>
            <tbody>{pipeRoughness.map(r=><tr key={r.material}><td className="border px-2 py-0.5">{r.material}</td><td className="border px-2 py-0.5 font-mono">{r.roughness}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "losses":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Minor Loss Coefficients K</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr><th className="border px-2 py-1 bg-gray-100 text-left">Fitting</th><th className="border px-2 py-1 bg-gray-100">K</th></tr></thead>
            <tbody>{minorLosses.map(r=><tr key={r.fitting}><td className="border px-2 py-0.5">{r.fitting}</td><td className="border px-2 py-0.5 font-mono">{r.K}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "mannings":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Manning's n</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr><th className="border px-2 py-1 bg-gray-100 text-left">Channel / Material</th><th className="border px-2 py-1 bg-gray-100">n (typical)</th><th className="border px-2 py-1 bg-gray-100">n (range)</th></tr></thead>
            <tbody>{manningsRoughness.map(r=><tr key={r.channel}><td className="border px-2 py-0.5">{r.channel}</td><td className="border px-2 py-0.5 font-mono">{r.n}</td><td className="border px-2 py-0.5 font-mono">{r.range}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "isa":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">ISA Standard Atmosphere</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr>{["Alt(km)","T(K)","P(kPa)","ρ(kg/m³)","a(m/s)"].map(h=><th key={h} className="border px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
            <tbody>{isaAtmosphere.map(r=><tr key={r.alt}><td className="border px-2 py-0.5">{r.alt}</td><td className="border px-2 py-0.5">{r.T}</td><td className="border px-2 py-0.5">{r.P}</td><td className="border px-2 py-0.5">{r.rho}</td><td className="border px-2 py-0.5">{r.a}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "isentropic":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Isentropic Flow (γ = 1.4)</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr>{["M","T/T₀","P/P₀","ρ/ρ₀","A/A*","μ (°)","ν (°)"].map(h=><th key={h} className="border px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
            <tbody>{isentropicFlow.map(r=><tr key={r.M}><td className="border px-2 py-0.5 font-mono">{r.M}</td><td className="border px-2 py-0.5 font-mono">{r.TT0}</td><td className="border px-2 py-0.5 font-mono">{r.PP0}</td><td className="border px-2 py-0.5 font-mono">{r.rr0}</td><td className="border px-2 py-0.5 font-mono">{r.AAst}</td><td className="border px-2 py-0.5 font-mono">{r.mu}</td><td className="border px-2 py-0.5 font-mono">{r.nu}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "shock":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Normal Shock (γ = 1.4)</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr>{["M₁","M₂","P₂/P₁","T₂/T₁","ρ₂/ρ₁","P₀₂/P₀₁"].map(h=><th key={h} className="border px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
            <tbody>{normalShock.map(r=><tr key={r.M1}><td className="border px-2 py-0.5 font-mono">{r.M1}</td><td className="border px-2 py-0.5 font-mono">{r.M2}</td><td className="border px-2 py-0.5 font-mono">{r.PP}</td><td className="border px-2 py-0.5 font-mono">{r.TT}</td><td className="border px-2 py-0.5 font-mono">{r.rr}</td><td className="border px-2 py-0.5 font-mono">{r.P0}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "fanno":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Fanno Flow (γ = 1.4)</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr>{["M","T/T*","P/P*","V/V*=ρ*/ρ","P₀/P₀*","4fL*/D"].map(h=><th key={h} className="border px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
            <tbody>{fannoFlow.map(r=><tr key={r.M}><td className="border px-2 py-0.5 font-mono">{r.M}</td><td className="border px-2 py-0.5 font-mono">{r.TT}</td><td className="border px-2 py-0.5 font-mono">{r.PP}</td><td className="border px-2 py-0.5 font-mono">{r.VV}</td><td className="border px-2 py-0.5 font-mono">{r.P0}</td><td className="border px-2 py-0.5 font-mono">{r.fLD}</td></tr>)}</tbody>
          </table>
        </div>
      );
    case "rayleigh":
      return (
        <div>
          <h2 className="text-lg font-bold mb-2">Rayleigh Flow (γ = 1.4)</h2>
          <table className="w-full text-xs border-collapse">
            <thead><tr>{["M","T/T*","P/P*","T₀/T₀*","P₀/P₀*","V/V*=ρ*/ρ"].map(h=><th key={h} className="border px-2 py-1 bg-gray-100 text-left">{h}</th>)}</tr></thead>
            <tbody>{rayleighFlow.map(r=><tr key={r.M}><td className="border px-2 py-0.5 font-mono">{r.M}</td><td className="border px-2 py-0.5 font-mono">{r.TT}</td><td className="border px-2 py-0.5 font-mono">{r.PP}</td><td className="border px-2 py-0.5 font-mono">{r.T0}</td><td className="border px-2 py-0.5 font-mono">{r.P0}</td><td className="border px-2 py-0.5 font-mono">{r.VV}</td></tr>)}</tbody>
          </table>
        </div>
      );
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function TablesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("water");
  const [showDownload, setShowDownload] = useState(false);
  const [selected, setSelected] = useState<Set<Tab>>(new Set(["water"]));
  const [printTables, setPrintTables] = useState<Tab[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset print state after browser finishes printing
  useEffect(() => {
    const reset = () => setPrintTables([]);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  // Close modal on outside click
  useEffect(() => {
    if (!showDownload) return;
    function onPointerDown(e: PointerEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowDownload(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showDownload]);

  // Close modal on Escape
  useEffect(() => {
    if (!showDownload) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDownload(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showDownload]);

  function openDownloadModal() {
    setSelected(new Set([activeTab]));
    setShowDownload(true);
  }

  function toggleTable(id: Tab) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const allIds = allTabs.map((t) => t.id);
  const allChecked = allIds.every((id) => selected.has(id));

  function handleSelectAll() {
    setSelected(allChecked ? new Set() : new Set(allIds));
  }

  function handleDownloadPDF() {
    const ids = allIds.filter((id) => selected.has(id));
    if (ids.length === 0) return;
    setPrintTables(ids);
    setTimeout(() => window.print(), 60);
    setShowDownload(false);
  }

  function handleDownloadCSV() {
    const ids = allIds.filter((id) => selected.has(id));
    if (ids.length === 0) return;
    const csv = generateCSV(ids);
    const filename =
      ids.length === 1
        ? `${allTabs.find((t) => t.id === ids[0])!.label.toLowerCase().replace(/\s+/g, "-")}.csv`
        : "fluid-mechanics-tables.csv";
    triggerFileDownload(csv, filename, "text/csv;charset=utf-8;");
    setShowDownload(false);
  }

  return (
    <div>
      {/* Print header — only visible when printing */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Fluid Mechanics Reference Tables</h1>
        <p className="text-sm text-gray-600">Fluids Pad · fluidmechanics.app</p>
      </div>

      {/* Page header */}
      <div className="mb-8 print:hidden">
        <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 inline-block">
          ← Back to Home
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Reference Tables</h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
              Fluid properties, pipe coefficients, open channel roughness, and compressible flow relations.
            </p>
          </div>

          {/* Download button */}
          <div className="relative">
            <button
              onClick={openDownloadModal}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>

      {/* ── Download modal ── */}
      {showDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            ref={modalRef}
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Download Tables</h2>
              <button
                onClick={() => setShowDownload(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Select all toggle */}
            <button
              onClick={handleSelectAll}
              className="mb-4 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {allChecked ? "Deselect all" : "Select all"}
            </button>

            {/* Table list grouped by category */}
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {navCategories.map((cat) => (
                <div key={cat.name}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                    {cat.name}
                  </p>
                  <div className="space-y-1">
                    {cat.tables.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleTable(t.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Format buttons */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={handleDownloadCSV}
                disabled={selected.size === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={selected.size === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                PDF
              </button>
            </div>

            {selected.size === 0 && (
              <p className="mt-2 text-xs text-center text-amber-500">Select at least one table to download.</p>
            )}
          </div>
        </div>
      )}

      {/* Mobile: select dropdown */}
      <div className="md:hidden mb-6 print:hidden">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as Tab)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          {navCategories.map((cat) => (
            <optgroup key={cat.name} label={cat.name}>
              {cat.tables.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex gap-6 print:block">

        {/* Sidebar */}
        <nav className="hidden md:block w-52 flex-shrink-0 print:hidden">
          <div className="sticky top-4 space-y-5">
            {navCategories.map((cat) => (
              <div key={cat.name}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 px-3">
                  {cat.name}
                </p>
                <div className="space-y-0.5">
                  {cat.tables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        activeTab === t.id
                          ? "bg-blue-600 text-white font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Table content */}
        <div className="flex-1 min-w-0">

          {activeTab === "water" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Water Properties vs Temperature</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">At 1 atm pressure</p>
              <InterpolationPanel
                varName="T" unit="°C" xKey="T" data={waterProperties}
                columns={[
                  { key: "rho", label: "ρ (kg/m³)" }, { key: "mu", label: "μ (mPa·s)" },
                  { key: "nu", label: "ν (×10⁻⁶ m²/s)" }, { key: "k", label: "k (W/mK)" },
                  { key: "cp", label: "cₚ (J/kgK)" }, { key: "Pr", label: "Pr" },
                  { key: "sigma", label: "σ (N/m)" }, { key: "a", label: "a (m/s)" },
                ]}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {["T (°C)","ρ (kg/m³)","μ (mPa·s)","ν (×10⁻⁶ m²/s)","k (W/mK)","cₚ (J/kgK)","Pr","σ (N/m)","a (m/s)"].map((h) => (
                        <th key={h} className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {waterProperties.map((r) => (
                      <tr key={r.T} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-4 font-medium">{r.T}</td>
                        <td className="py-2 pr-4">{r.rho}</td><td className="py-2 pr-4">{r.mu}</td>
                        <td className="py-2 pr-4">{r.nu}</td><td className="py-2 pr-4">{r.k}</td>
                        <td className="py-2 pr-4">{r.cp}</td><td className="py-2 pr-4">{r.Pr}</td>
                        <td className="py-2 pr-4">{r.sigma}</td><td className="py-2 pr-4">{r.a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "air" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Air Properties vs Temperature</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Dry air at 1 atm (ideal gas)</p>
              <InterpolationPanel
                varName="T" unit="°C" xKey="T" data={airProperties}
                columns={[
                  { key: "rho", label: "ρ (kg/m³)" }, { key: "mu", label: "μ (×10⁻⁵ Pa·s)" },
                  { key: "nu", label: "ν (×10⁻⁵ m²/s)" }, { key: "k", label: "k (W/mK)" },
                  { key: "cp", label: "cₚ (J/kgK)" }, { key: "Pr", label: "Pr" },
                ]}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {["T (°C)","ρ (kg/m³)","μ (×10⁻⁵ Pa·s)","ν (×10⁻⁵ m²/s)","k (W/mK)","cₚ (J/kgK)","Pr"].map((h) => (
                        <th key={h} className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {airProperties.map((r) => (
                      <tr key={r.T} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-4 font-medium">{r.T}</td>
                        <td className="py-2 pr-4">{r.rho}</td><td className="py-2 pr-4">{r.mu}</td>
                        <td className="py-2 pr-4">{r.nu}</td><td className="py-2 pr-4">{r.k}</td>
                        <td className="py-2 pr-4">{r.cp}</td><td className="py-2 pr-4">{r.Pr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "fluids" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Common Fluid Properties</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                At stated temperature. Pᵥ = vapour pressure; γ = specific heat ratio (gases only).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {["Fluid","ρ (kg/m³)","μ (Pa·s)","ν (m²/s)","Pᵥ (kPa)","γ (gas)"].map((h) => (
                        <th key={h} className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commonFluids.map((r) => (
                      <tr key={r.fluid} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-4 font-medium whitespace-nowrap">{r.fluid}</td>
                        <td className="py-2 pr-4">{r.rho}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{r.mu}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{r.nu}</td>
                        <td className="py-2 pr-4">{r.Pv}</td>
                        <td className="py-2 pr-4">{r.gamma}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "roughness" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Pipe Absolute Roughness ε</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Use ε/D (relative roughness) in the Colebrook-White or Swamee-Jain equations. Values for new pipe in clean service.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-6 font-semibold text-gray-700 dark:text-gray-300">Material</th>
                      <th className="py-2 font-semibold text-gray-700 dark:text-gray-300">ε (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeRoughness.map((r) => (
                      <tr key={r.material} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-6 font-medium">{r.material}</td>
                        <td className="py-2 font-mono">{r.roughness}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "losses" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Minor Loss Coefficients K</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                hL = K · V²/(2g). Velocity refers to the upstream pipe unless noted.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-6 font-semibold text-gray-700 dark:text-gray-300">Fitting / Component</th>
                      <th className="py-2 font-semibold text-gray-700 dark:text-gray-300">K</th>
                    </tr>
                  </thead>
                  <tbody>
                    {minorLosses.map((r) => (
                      <tr key={r.fitting} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-6">{r.fitting}</td>
                        <td className="py-2 font-mono font-medium">{r.K}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "mannings" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Manning's Roughness Coefficient n</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Used in V = (1/n) Rₕ^(2/3) S^(1/2). Lower n = smoother channel.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-6 font-semibold text-gray-700 dark:text-gray-300">Material / Channel Type</th>
                      <th className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">n (typical)</th>
                      <th className="py-2 font-semibold text-gray-700 dark:text-gray-300">n (range)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manningsRoughness.map((r) => (
                      <tr key={r.channel} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-6">{r.channel}</td>
                        <td className="py-2 pr-4 font-mono font-medium">{r.n}</td>
                        <td className="py-2 font-mono text-gray-500 dark:text-gray-400">{r.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "isa" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">ISA Standard Atmosphere</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Sea level: P₀ = 101.325 kPa, T₀ = 288.15 K, ρ₀ = 1.225 kg/m³, a₀ = 340.3 m/s. Troposphere lapse rate −6.5 K/km; isothermal above 11 km.
              </p>
              <InterpolationPanel
                varName="altitude" unit="km" xKey="alt" data={isaNumeric}
                columns={[
                  { key: "T", label: "T (K)" }, { key: "P", label: "P (kPa)" },
                  { key: "rho", label: "ρ (kg/m³)" }, { key: "a", label: "a (m/s)" },
                ]}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {["Alt (km)","T (K)","P (kPa)","ρ (kg/m³)","a (m/s)"].map((h) => (
                        <th key={h} className="py-2 pr-5 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isaAtmosphere.map((r) => (
                      <tr key={r.alt} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-5 font-medium">{r.alt}</td>
                        <td className="py-2 pr-5">{r.T}</td><td className="py-2 pr-5">{r.P}</td>
                        <td className="py-2 pr-5">{r.rho}</td><td className="py-2 pr-5">{r.a}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "isentropic" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Isentropic Flow Relations</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                γ = 1.4 (air). Subscript 0 = stagnation; * = sonic throat. μ = Mach angle; ν = Prandtl-Meyer angle (supersonic only).
              </p>
              <InterpolationPanel
                varName="M" unit="" xKey="M" data={isentropicNumeric}
                columns={[
                  { key: "TT0", label: "T/T₀" }, { key: "PP0", label: "P/P₀" },
                  { key: "rr0", label: "ρ/ρ₀" }, { key: "AAst", label: "A/A*" },
                ]}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {["M","T/T₀","P/P₀","ρ/ρ₀","A/A*","μ (°)","ν (°)"].map((h) => (
                        <th key={h} className="py-2 pr-5 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isentropicFlow.map((r) => (
                      <tr key={r.M} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${r.M === "1.0" ? "bg-blue-50 dark:bg-blue-950/30 font-medium" : ""}`}>
                        <td className="py-2 pr-5 font-mono font-medium">{r.M}</td>
                        <td className="py-2 pr-5 font-mono">{r.TT0}</td><td className="py-2 pr-5 font-mono">{r.PP0}</td>
                        <td className="py-2 pr-5 font-mono">{r.rr0}</td><td className="py-2 pr-5 font-mono">{r.AAst}</td>
                        <td className="py-2 pr-5 font-mono text-gray-500 dark:text-gray-400">{r.mu}</td>
                        <td className="py-2 pr-5 font-mono text-gray-500 dark:text-gray-400">{r.nu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === "shock" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Normal Shock Relations</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                γ = 1.4 (air). Subscripts 1 = upstream, 2 = downstream.
              </p>
              <InterpolationPanel
                varName="M₁" unit="" xKey="M1" data={normalShockNumeric}
                columns={[
                  { key: "M2", label: "M₂" }, { key: "PP", label: "P₂/P₁" },
                  { key: "TT", label: "T₂/T₁" }, { key: "rr", label: "ρ₂/ρ₁" },
                  { key: "P0", label: "P₀₂/P₀₁" },
                ]}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {["M₁","M₂","P₂/P₁","T₂/T₁","ρ₂/ρ₁","P₀₂/P₀₁"].map((h) => (
                        <th key={h} className="py-2 pr-5 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {normalShock.map((r) => (
                      <tr key={r.M1} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 pr-5 font-mono font-medium">{r.M1}</td>
                        <td className="py-2 pr-5 font-mono">{r.M2}</td><td className="py-2 pr-5 font-mono">{r.PP}</td>
                        <td className="py-2 pr-5 font-mono">{r.TT}</td><td className="py-2 pr-5 font-mono">{r.rr}</td>
                        <td className="py-2 pr-5 font-mono">{r.P0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Fanno Flow ── */}
          {activeTab === "fanno" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Fanno Flow</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Adiabatic duct flow with friction, γ = 1.4. * = sonic (choked) reference. 4fL*/D = friction parameter to choking; V/V* = ρ*/ρ = velocity ratio.
              </p>
              <InterpolationPanel
                varName="M" unit="" xKey="M" data={fannoNumeric}
                columns={[
                  { key: "TT",  label: "T/T*" },
                  { key: "PP",  label: "P/P*" },
                  { key: "VV",  label: "V/V* (= ρ*/ρ)" },
                  { key: "P0",  label: "P₀/P₀*" },
                  { key: "fLD", label: "4fL*/D" },
                ]}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {["M","T/T*","P/P*","V/V* = ρ*/ρ","P₀/P₀*","4fL*/D"].map((h) => (
                        <th key={h} className="py-2 pr-5 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fannoFlow.map((r) => (
                      <tr key={r.M} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${r.M === "1.0" ? "bg-blue-50 dark:bg-blue-950/30 font-medium" : ""}`}>
                        <td className="py-2 pr-5 font-mono font-medium">{r.M}</td>
                        <td className="py-2 pr-5 font-mono">{r.TT}</td>
                        <td className="py-2 pr-5 font-mono">{r.PP}</td>
                        <td className="py-2 pr-5 font-mono">{r.VV}</td>
                        <td className="py-2 pr-5 font-mono">{r.P0}</td>
                        <td className="py-2 pr-5 font-mono">{r.fLD}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Rayleigh Flow ── */}
          {activeTab === "rayleigh" && (
            <Card>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Rayleigh Flow</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Constant-area duct with heat addition, γ = 1.4. * = sonic reference (maximum heat addition). T₀/T₀* shows how close to choking from heat transfer.
              </p>
              <InterpolationPanel
                varName="M" unit="" xKey="M" data={rayleighNumeric}
                columns={[
                  { key: "TT", label: "T/T*" },
                  { key: "PP", label: "P/P*" },
                  { key: "T0", label: "T₀/T₀*" },
                  { key: "P0", label: "P₀/P₀*" },
                  { key: "VV", label: "V/V* (= ρ*/ρ)" },
                ]}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      {["M","T/T*","P/P*","T₀/T₀*","P₀/P₀*","V/V* = ρ*/ρ"].map((h) => (
                        <th key={h} className="py-2 pr-5 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rayleighFlow.map((r) => (
                      <tr key={r.M} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${r.M === "1.0" ? "bg-blue-50 dark:bg-blue-950/30 font-medium" : ""}`}>
                        <td className="py-2 pr-5 font-mono font-medium">{r.M}</td>
                        <td className="py-2 pr-5 font-mono">{r.TT}</td>
                        <td className="py-2 pr-5 font-mono">{r.PP}</td>
                        <td className="py-2 pr-5 font-mono">{r.T0}</td>
                        <td className="py-2 pr-5 font-mono">{r.P0}</td>
                        <td className="py-2 pr-5 font-mono">{r.VV}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

        </div>
      </div>

      <References refs={REFS_TABLES} />

      {/* PDF print section — only renders selected tables when printTables is set */}
      {printTables.length > 0 && (
        <div className="hidden print:block space-y-8 mt-4">
          {printTables.map((id) => (
            <PrintTableSection key={id} id={id} />
          ))}
        </div>
      )}
    </div>
  );
}
