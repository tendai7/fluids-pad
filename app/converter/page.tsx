"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { References } from "@/components/References";
import { REFS_CONVERTER } from "@/lib/references";

// ─── Data ──────────────────────────────────────────────────────────────────────
interface Unit { name: string; symbol: string; factor: number; offset?: number }
interface Category { name: string; base: string; icon: string; units: Unit[] }

const TWO_PI = 2 * Math.PI;

const categories: Category[] = [
  {
    name: "Length", base: "m", icon: "📏",
    units: [
      { name: "Metres",       symbol: "m",   factor: 1 },
      { name: "Millimetres",  symbol: "mm",  factor: 0.001 },
      { name: "Centimetres",  symbol: "cm",  factor: 0.01 },
      { name: "Kilometres",   symbol: "km",  factor: 1000 },
      { name: "Micrometres",  symbol: "μm",  factor: 1e-6 },
      { name: "Nanometres",   symbol: "nm",  factor: 1e-9 },
      { name: "Inches",       symbol: "in",  factor: 0.0254 },
      { name: "Feet",         symbol: "ft",  factor: 0.3048 },
      { name: "Yards",        symbol: "yd",  factor: 0.9144 },
      { name: "Miles",        symbol: "mi",  factor: 1609.344 },
    ],
  },
  {
    name: "Area", base: "m²", icon: "▪️",
    units: [
      { name: "m²",       symbol: "m²",   factor: 1 },
      { name: "cm²",      symbol: "cm²",  factor: 1e-4 },
      { name: "mm²",      symbol: "mm²",  factor: 1e-6 },
      { name: "km²",      symbol: "km²",  factor: 1e6 },
      { name: "Hectares", symbol: "ha",   factor: 1e4 },
      { name: "in²",      symbol: "in²",  factor: 6.4516e-4 },
      { name: "ft²",      symbol: "ft²",  factor: 0.092903 },
      { name: "yd²",      symbol: "yd²",  factor: 0.836127 },
      { name: "Acres",    symbol: "acre", factor: 4046.86 },
    ],
  },
  {
    name: "Volume", base: "m³", icon: "📦",
    units: [
      { name: "m³",            symbol: "m³",     factor: 1 },
      { name: "Litres",        symbol: "L",      factor: 0.001 },
      { name: "Millilitres",   symbol: "mL",     factor: 1e-6 },
      { name: "Microlitres",   symbol: "µL",     factor: 1e-9 },
      { name: "cm³",           symbol: "cm³",    factor: 1e-6 },
      { name: "ft³",           symbol: "ft³",    factor: 0.0283168 },
      { name: "in³",           symbol: "in³",    factor: 1.6387e-5 },
      { name: "US gallons",    symbol: "US gal", factor: 3.78541e-3 },
      { name: "UK gallons",    symbol: "UK gal", factor: 4.54609e-3 },
      { name: "US quarts",     symbol: "US qt",  factor: 9.46353e-4 },
      { name: "Barrels (oil)", symbol: "bbl",    factor: 0.158987 },
    ],
  },
  {
    name: "Mass", base: "kg", icon: "⚖️",
    units: [
      { name: "Kilograms",       symbol: "kg",     factor: 1 },
      { name: "Grams",           symbol: "g",      factor: 0.001 },
      { name: "Milligrams",      symbol: "mg",     factor: 1e-6 },
      { name: "Tonnes (metric)", symbol: "t",      factor: 1000 },
      { name: "Pounds",          symbol: "lb",     factor: 0.453592 },
      { name: "Ounces",          symbol: "oz",     factor: 0.0283495 },
      { name: "Short ton (US)",  symbol: "US ton", factor: 907.185 },
      { name: "Long ton (UK)",   symbol: "UK ton", factor: 1016.05 },
      { name: "Slugs",           symbol: "slug",   factor: 14.5939 },
    ],
  },
  {
    name: "Time", base: "s", icon: "⏱️",
    units: [
      { name: "Seconds",      symbol: "s",   factor: 1 },
      { name: "Milliseconds", symbol: "ms",  factor: 0.001 },
      { name: "Microseconds", symbol: "μs",  factor: 1e-6 },
      { name: "Minutes",      symbol: "min", factor: 60 },
      { name: "Hours",        symbol: "hr",  factor: 3600 },
      { name: "Days",         symbol: "day", factor: 86400 },
      { name: "Weeks",        symbol: "wk",  factor: 604800 },
    ],
  },
  {
    name: "Velocity", base: "m/s", icon: "💨",
    units: [
      { name: "m/s",   symbol: "m/s",  factor: 1 },
      { name: "km/h",  symbol: "km/h", factor: 1 / 3.6 },
      { name: "ft/s",  symbol: "ft/s", factor: 0.3048 },
      { name: "mph",   symbol: "mph",  factor: 0.44704 },
      { name: "Knots", symbol: "kn",   factor: 0.514444 },
      { name: "cm/s",  symbol: "cm/s", factor: 0.01 },
      { name: "mm/s",  symbol: "mm/s", factor: 0.001 },
    ],
  },
  {
    name: "Acceleration", base: "m/s²", icon: "🚀",
    units: [
      { name: "m/s²",          symbol: "m/s²",   factor: 1 },
      { name: "ft/s²",         symbol: "ft/s²",  factor: 0.3048 },
      { name: "g (standard)",  symbol: "g",      factor: 9.80665 },
      { name: "cm/s² (Gal)",   symbol: "Gal",    factor: 0.01 },
      { name: "in/s²",         symbol: "in/s²",  factor: 0.0254 },
      { name: "km/h·s",        symbol: "km/h·s", factor: 1 / 3.6 },
    ],
  },
  {
    name: "Pressure", base: "Pa", icon: "🔴",
    units: [
      { name: "Pascals",     symbol: "Pa",      factor: 1 },
      { name: "Kilopascals", symbol: "kPa",     factor: 1e3 },
      { name: "Megapascals", symbol: "MPa",     factor: 1e6 },
      { name: "Bar",         symbol: "bar",     factor: 1e5 },
      { name: "Millibar",    symbol: "mbar",    factor: 100 },
      { name: "Atmosphere",  symbol: "atm",     factor: 101325 },
      { name: "PSI",         symbol: "psi",     factor: 6894.757 },
      { name: "mmHg",        symbol: "mmHg",    factor: 133.322 },
      { name: "Torr",        symbol: "torr",    factor: 133.322 },
      { name: "inHg",        symbol: "inHg",    factor: 3386.39 },
      { name: "inH₂O",       symbol: "inH₂O",   factor: 249.089 },
      { name: "mmH₂O",       symbol: "mmH₂O",   factor: 9.80665 },
      { name: "kgf/cm²",     symbol: "kgf/cm²", factor: 98066.5 },
      { name: "lbf/ft²",     symbol: "lbf/ft²", factor: 47.8803 },
      { name: "dyn/cm²",     symbol: "dyn/cm²", factor: 0.1 },
    ],
  },
  {
    name: "Temperature", base: "K", icon: "🌡️",
    units: [
      { name: "Kelvin",     symbol: "K",  factor: 1,       offset: 0 },
      { name: "Celsius",    symbol: "°C", factor: 1,       offset: 273.15 },
      { name: "Fahrenheit", symbol: "°F", factor: 5 / 9,   offset: 273.15 - 32 * 5 / 9 },
      { name: "Rankine",    symbol: "°R", factor: 5 / 9,   offset: 0 },
    ],
  },
  {
    name: "Force", base: "N", icon: "💪",
    units: [
      { name: "Newtons",     symbol: "N",   factor: 1 },
      { name: "Kilonewtons", symbol: "kN",  factor: 1e3 },
      { name: "kgf",         symbol: "kgf", factor: 9.80665 },
      { name: "lbf",         symbol: "lbf", factor: 4.44822 },
      { name: "Dyne",        symbol: "dyn", factor: 1e-5 },
      { name: "kip (klbf)",  symbol: "kip", factor: 4448.22 },
    ],
  },
  {
    name: "Torque", base: "N·m", icon: "🔧",
    units: [
      { name: "Newton·metre", symbol: "N·m",    factor: 1 },
      { name: "kN·m",         symbol: "kN·m",   factor: 1000 },
      { name: "N·cm",         symbol: "N·cm",   factor: 0.01 },
      { name: "lbf·ft",       symbol: "lbf·ft", factor: 1.35582 },
      { name: "lbf·in",       symbol: "lbf·in", factor: 0.112985 },
      { name: "kgf·m",        symbol: "kgf·m",  factor: 9.80665 },
      { name: "dyn·cm",       symbol: "dyn·cm", factor: 1e-7 },
    ],
  },
  {
    name: "Energy", base: "J", icon: "🔋",
    units: [
      { name: "Joules",         symbol: "J",      factor: 1 },
      { name: "Kilojoules",     symbol: "kJ",     factor: 1e3 },
      { name: "Megajoules",     symbol: "MJ",     factor: 1e6 },
      { name: "Watt-hours",     symbol: "Wh",     factor: 3600 },
      { name: "Kilowatt-hours", symbol: "kWh",    factor: 3.6e6 },
      { name: "BTU",            symbol: "BTU",    factor: 1055.06 },
      { name: "Calories",       symbol: "cal",    factor: 4.184 },
      { name: "Kilocalories",   symbol: "kcal",   factor: 4184 },
      { name: "Foot-pounds",    symbol: "ft·lbf", factor: 1.35582 },
      { name: "Electron-volts", symbol: "eV",     factor: 1.60218e-19 },
    ],
  },
  {
    name: "Power", base: "W", icon: "⚡",
    units: [
      { name: "Watts",             symbol: "W",       factor: 1 },
      { name: "Kilowatts",         symbol: "kW",      factor: 1e3 },
      { name: "Megawatts",         symbol: "MW",      factor: 1e6 },
      { name: "Horsepower (mech)", symbol: "hp",      factor: 745.7 },
      { name: "Horsepower (elec)", symbol: "hp(e)",   factor: 746 },
      { name: "BTU/hr",            symbol: "BTU/hr",  factor: 0.29307 },
      { name: "kcal/hr",           symbol: "kcal/hr", factor: 1.163 },
      { name: "kJ/hr",             symbol: "kJ/hr",   factor: 1 / 3.6 },
    ],
  },
  {
    name: "Flow Rate (Vol.)", base: "m³/s", icon: "🌊",
    units: [
      { name: "m³/s",          symbol: "m³/s",   factor: 1 },
      { name: "m³/h",          symbol: "m³/h",   factor: 1 / 3600 },
      { name: "L/s",           symbol: "L/s",    factor: 0.001 },
      { name: "L/min",         symbol: "L/min",  factor: 0.001 / 60 },
      { name: "L/h",           symbol: "L/h",    factor: 0.001 / 3600 },
      { name: "US gpm",        symbol: "gpm",    factor: 6.30902e-5 },
      { name: "US gph",        symbol: "gph",    factor: 1.05150e-6 },
      { name: "ft³/s (cfs)",   symbol: "cfs",    factor: 0.0283168 },
      { name: "ft³/min (cfm)", symbol: "cfm",    factor: 4.71947e-4 },
      { name: "UK gpm",        symbol: "UK gpm", factor: 7.57682e-5 },
      { name: "Barrels/day",   symbol: "bbl/d",  factor: 1.84013e-6 },
    ],
  },
  {
    name: "Mass Flow Rate", base: "kg/s", icon: "💧",
    units: [
      { name: "kg/s",   symbol: "kg/s",   factor: 1 },
      { name: "kg/h",   symbol: "kg/h",   factor: 1 / 3600 },
      { name: "kg/min", symbol: "kg/min", factor: 1 / 60 },
      { name: "g/s",    symbol: "g/s",    factor: 0.001 },
      { name: "lb/s",   symbol: "lb/s",   factor: 0.453592 },
      { name: "lb/h",   symbol: "lb/h",   factor: 0.453592 / 3600 },
      { name: "lb/min", symbol: "lb/min", factor: 0.453592 / 60 },
      { name: "t/h",    symbol: "t/h",    factor: 1000 / 3600 },
    ],
  },
  {
    name: "Density", base: "kg/m³", icon: "🧪",
    units: [
      { name: "kg/m³",       symbol: "kg/m³",     factor: 1 },
      { name: "g/cm³",       symbol: "g/cm³",     factor: 1000 },
      { name: "g/L",         symbol: "g/L",       factor: 1 },
      { name: "kg/L",        symbol: "kg/L",      factor: 1000 },
      { name: "g/mL",        symbol: "g/mL",      factor: 1000 },
      { name: "lb/ft³",      symbol: "lb/ft³",    factor: 16.0185 },
      { name: "lb/in³",      symbol: "lb/in³",    factor: 27679.9 },
      { name: "lb/gal (US)", symbol: "lb/US gal", factor: 119.826 },
    ],
  },
  {
    name: "Dyn. Viscosity", base: "Pa·s", icon: "🫧",
    units: [
      { name: "Pa·s",       symbol: "Pa·s",      factor: 1 },
      { name: "mPa·s",      symbol: "mPa·s",     factor: 0.001 },
      { name: "Poise",      symbol: "P",         factor: 0.1 },
      { name: "Centipoise", symbol: "cP",        factor: 0.001 },
      { name: "N·s/m²",     symbol: "N·s/m²",    factor: 1 },
      { name: "lb/(ft·s)",  symbol: "lb/(ft·s)", factor: 1.48816 },
      { name: "lb/(ft·hr)", symbol: "lb/(ft·h)", factor: 4.13379e-4 },
    ],
  },
  {
    name: "Kin. Viscosity", base: "m²/s", icon: "💧",
    units: [
      { name: "m²/s",          symbol: "m²/s",  factor: 1 },
      { name: "mm²/s (cSt)",   symbol: "cSt",   factor: 1e-6 },
      { name: "cm²/s (Stoke)", symbol: "St",    factor: 1e-4 },
      { name: "ft²/s",         symbol: "ft²/s", factor: 0.092903 },
      { name: "ft²/hr",        symbol: "ft²/hr",factor: 0.092903 / 3600 },
    ],
  },
  {
    name: "Surface Tension", base: "N/m", icon: "🔵",
    units: [
      { name: "N/m",    symbol: "N/m",    factor: 1 },
      { name: "mN/m",   symbol: "mN/m",   factor: 0.001 },
      { name: "dyn/cm", symbol: "dyn/cm", factor: 0.001 },
      { name: "lbf/ft", symbol: "lbf/ft", factor: 14.5939 },
      { name: "lbf/in", symbol: "lbf/in", factor: 175.127 },
    ],
  },
  {
    name: "Permeability", base: "m²", icon: "🪨",
    units: [
      { name: "m²",         symbol: "m²",  factor: 1 },
      { name: "cm²",        symbol: "cm²", factor: 1e-4 },
      { name: "mm²",        symbol: "mm²", factor: 1e-6 },
      { name: "Darcy",      symbol: "D",   factor: 9.869233e-13 },
      { name: "Millidarcy", symbol: "mD",  factor: 9.869233e-16 },
      { name: "ft²",        symbol: "ft²", factor: 0.092903 },
    ],
  },
  {
    name: "Concentration", base: "kg/m³", icon: "🧫",
    units: [
      { name: "kg/m³",      symbol: "kg/m³", factor: 1 },
      { name: "g/L",        symbol: "g/L",   factor: 1 },
      { name: "g/m³",       symbol: "g/m³",  factor: 0.001 },
      { name: "mg/L",       symbol: "mg/L",  factor: 0.001 },
      { name: "µg/L",       symbol: "µg/L",  factor: 1e-6 },
      { name: "ppm (mg/L)", symbol: "ppm",   factor: 0.001 },
      { name: "ppb (µg/L)", symbol: "ppb",   factor: 1e-6 },
    ],
  },
  {
    name: "Thermal Conductivity", base: "W/mK", icon: "🔥",
    units: [
      { name: "W/mK",            symbol: "W/mK",          factor: 1 },
      { name: "kW/mK",           symbol: "kW/mK",         factor: 1000 },
      { name: "mW/mK",           symbol: "mW/mK",         factor: 0.001 },
      { name: "BTU/(hr·ft·°F)",  symbol: "BTU/hr·ft·°F",  factor: 1.73073 },
      { name: "kcal/(hr·m·°C)",  symbol: "kcal/hr·m·°C",  factor: 1.163 },
      { name: "cal/(s·cm·°C)",   symbol: "cal/s·cm·°C",   factor: 418.68 },
    ],
  },
  {
    name: "Thermal Diffusivity", base: "m²/s", icon: "🌡️",
    units: [
      { name: "m²/s",   symbol: "m²/s",   factor: 1 },
      { name: "cm²/s",  symbol: "cm²/s",  factor: 1e-4 },
      { name: "mm²/s",  symbol: "mm²/s",  factor: 1e-6 },
      { name: "ft²/s",  symbol: "ft²/s",  factor: 0.092903 },
      { name: "ft²/hr", symbol: "ft²/hr", factor: 0.092903 / 3600 },
    ],
  },
  {
    name: "Specific Heat", base: "J/kgK", icon: "♨️",
    units: [
      { name: "J/kgK",        symbol: "J/kgK",      factor: 1 },
      { name: "kJ/kgK",       symbol: "kJ/kgK",     factor: 1000 },
      { name: "BTU/(lb·°F)",  symbol: "BTU/lb·°F",  factor: 4186.8 },
      { name: "cal/(g·°C)",   symbol: "cal/g·°C",   factor: 4184 },
      { name: "kcal/(kg·°C)", symbol: "kcal/kg·°C", factor: 4184 },
    ],
  },
  {
    name: "Heat Transfer Coeff.", base: "W/m²K", icon: "🌡️",
    units: [
      { name: "W/m²K",            symbol: "W/m²K",          factor: 1 },
      { name: "kW/m²K",           symbol: "kW/m²K",         factor: 1000 },
      { name: "BTU/(hr·ft²·°F)",  symbol: "BTU/hr·ft²·°F",  factor: 5.67826 },
      { name: "kcal/(hr·m²·°C)",  symbol: "kcal/hr·m²·°C",  factor: 1.163 },
      { name: "cal/(s·cm²·°C)",   symbol: "cal/s·cm²·°C",   factor: 41868 },
    ],
  },
  {
    name: "Rotational Speed", base: "rad/s", icon: "🔄",
    units: [
      { name: "rad/s",   symbol: "rad/s",  factor: 1 },
      { name: "rpm",     symbol: "rpm",    factor: TWO_PI / 60 },
      { name: "rps",     symbol: "rps",    factor: TWO_PI },
      { name: "Hz",      symbol: "Hz",     factor: TWO_PI },
      { name: "°/s",     symbol: "°/s",    factor: Math.PI / 180 },
      { name: "rev/min", symbol: "rev/min",factor: TWO_PI / 60 },
    ],
  },
  {
    name: "Angle", base: "rad", icon: "📐",
    units: [
      { name: "Radians",      symbol: "rad",  factor: 1 },
      { name: "Degrees",      symbol: "°",    factor: Math.PI / 180 },
      { name: "Gradians",     symbol: "grad", factor: Math.PI / 200 },
      { name: "Milliradians", symbol: "mrad", factor: 0.001 },
      { name: "Revolutions",  symbol: "rev",  factor: TWO_PI },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function toBase(value: number, u: Unit): number { return value * u.factor + (u.offset ?? 0); }
function fromBase(base: number, u: Unit): number { return (base - (u.offset ?? 0)) / u.factor; }

function fmt(value: number, sf = 7): string {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 1e-3 && abs < 1e9) return parseFloat(value.toPrecision(sf)).toString();
  return value.toExponential(sf - 1);
}

function fmtFactor(from: Unit, to: Unit): string {
  if (from.symbol === to.symbol) return `1 ${from.symbol} = 1 ${to.symbol}`;
  return `1 ${from.symbol} = ${fmt(fromBase(toBase(1, from), to))} ${to.symbol}`;
}

// ─── Groups ────────────────────────────────────────────────────────────────────
const GROUPS: { label: string; cats: string[] }[] = [
  { label: "Geometry",         cats: ["Length", "Area", "Volume", "Angle"] },
  { label: "Mechanics",        cats: ["Mass", "Force", "Torque", "Energy", "Power", "Acceleration"] },
  { label: "Fluid Flow",       cats: ["Velocity", "Flow Rate (Vol.)", "Mass Flow Rate", "Pressure"] },
  { label: "Fluid Properties", cats: ["Density", "Dyn. Viscosity", "Kin. Viscosity", "Surface Tension", "Permeability", "Concentration"] },
  { label: "Thermodynamics",   cats: ["Temperature", "Thermal Conductivity", "Thermal Diffusivity", "Specific Heat", "Heat Transfer Coeff."] },
  { label: "Other",            cats: ["Time", "Rotational Speed"] },
];

const PRECISION_OPTIONS = [
  { label: "Auto", value: 7 },
  { label: "2 s.f.", value: 2 },
  { label: "4 s.f.", value: 4 },
  { label: "6 s.f.", value: 6 },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ConverterPage() {
  const [catName, setCatName]       = useState(categories[0].name);
  const [fromSym, setFromSym]       = useState(categories[0].units[0].symbol);
  const [toSym, setToSym]           = useState(categories[0].units[1].symbol);
  const [inputValue, setInputValue] = useState("1");
  const [copied, setCopied]         = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [search, setSearch]         = useState("");
  const [precision, setPrecision]   = useState(7);
  const [mounted, setMounted]       = useState(false);

  // Restore from URL params or localStorage on mount
  useEffect(() => {
    const p       = new URLSearchParams(window.location.search);
    const urlCat  = p.get("cat");
    const urlFrom = p.get("from");
    const urlTo   = p.get("to");
    const urlVal  = p.get("val");
    const savedCat = localStorage.getItem("converter_cat") ?? "";

    const catStr = (urlCat  && categories.find(c => c.name === urlCat))  ? urlCat
                 : (savedCat && categories.find(c => c.name === savedCat)) ? savedCat
                 : categories[0].name;
    const catObj = categories.find(c => c.name === catStr)!;
    const from   = (urlFrom && catObj.units.find(u => u.symbol === urlFrom)) ? urlFrom : catObj.units[0].symbol;
    const to     = (urlTo   && catObj.units.find(u => u.symbol === urlTo))   ? urlTo   : catObj.units[1].symbol;

    setCatName(catStr);
    setFromSym(from);
    setToSym(to);
    if (urlVal) setInputValue(urlVal);
    setMounted(true);
  }, []);

  // Sync URL + localStorage after mount
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("converter_cat", catName);
    const p = new URLSearchParams();
    p.set("cat", catName);
    p.set("from", fromSym);
    p.set("to", toSym);
    if (inputValue !== "1") p.set("val", inputValue);
    window.history.replaceState(null, "", "?" + p.toString());
  }, [catName, fromSym, toSym, inputValue, mounted]);

  // Keyboard shortcut: S = swap
  const swapRef = useRef({ fromSym, toSym });
  swapRef.current = { fromSym, toSym };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "s" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const { fromSym: f, toSym: t } = swapRef.current;
      setFromSym(t);
      setToSym(f);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const cat      = categories.find(c => c.name === catName)!;
  const fromUnit = cat.units.find(u => u.symbol === fromSym);
  const toUnit   = cat.units.find(u => u.symbol === toSym);
  const numInput = parseFloat(inputValue);
  const hasInput = inputValue !== "" && !isNaN(numInput);

  const f = useCallback((v: number) => fmt(v, precision), [precision]);

  const result = useMemo(() => {
    if (!hasInput || !fromUnit || !toUnit) return "—";
    return f(fromBase(toBase(numInput, fromUnit), toUnit));
  }, [hasInput, numInput, fromUnit, toUnit, f]);

  const factorLine = useMemo(() => {
    if (!fromUnit || !toUnit) return null;
    return fmtFactor(fromUnit, toUnit);
  }, [fromUnit, toUnit]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return GROUPS;
    const q = search.toLowerCase();
    return GROUPS.map(g => ({
      ...g,
      cats: g.cats.filter(cn => {
        if (cn.toLowerCase().includes(q)) return true;
        const c = categories.find(x => x.name === cn);
        return c?.units.some(u => u.name.toLowerCase().includes(q) || u.symbol.toLowerCase().includes(q));
      }),
    })).filter(g => g.cats.length > 0);
  }, [search]);

  const selectCategory = useCallback((name: string) => {
    const c = categories.find(x => x.name === name)!;
    setCatName(name);
    setFromSym(c.units[0].symbol);
    setToSym(c.units[1].symbol);
    setInputValue("1");
  }, []);

  const swap = () => { setFromSym(toSym); setToSym(fromSym); };

  const copyResult = async () => {
    if (result === "—") return;
    await navigator.clipboard.writeText(`${result} ${toSym}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Unit Converter</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
          Convert anything from pressure and viscosity to thermal conductivity and rotational speed.
        </p>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 gap-1">
          <div className="relative mb-2">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredGroups.map(g => (
            <div key={g.label}>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 py-1.5">{g.label}</p>
              {g.cats.map(cn => {
                const c      = categories.find(x => x.name === cn)!;
                const active = catName === cn;
                return (
                  <button key={cn} onClick={() => selectCategory(cn)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${
                      active
                        ? "bg-blue-600 text-white font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}>
                    <span className="text-sm leading-none">{c.icon}</span>
                    <span className="truncate text-xs">{cn}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Mobile dropdown */}
          <div className="lg:hidden">
            <div className="relative">
              <select
                value={catName}
                onChange={(e) => selectCategory(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.cats.map(cn => {
                      const c = categories.find(x => x.name === cn)!;
                      return <option key={cn} value={cn}>{c.icon} {cn}</option>;
                    })}
                  </optgroup>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* ── Converter card ───────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-wrap gap-y-2">
              <span className="text-lg">{cat.icon}</span>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{cat.name}</span>
              <span className="text-xs text-gray-400">· base: {cat.base}</span>
              {cat.name === "Temperature" && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Offset conversion</span>
              )}
              {/* Precision selector */}
              <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-gray-400 mr-1 hidden sm:inline">Precision:</span>
                {PRECISION_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setPrecision(o.value)}
                    className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                      precision === o.value
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >{o.label}</button>
                ))}
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_48px_1fr] gap-4 items-center">

                {/* FROM */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">From</label>
                  <div className="relative">
                    <select
                      value={fromSym}
                      onChange={(e) => setFromSym(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {cat.units.map(u => (
                        <option key={u.symbol} value={u.symbol}>
                          {u.name !== u.symbol ? `${u.symbol} — ${u.name}` : u.symbol}
                        </option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-xl font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-right"
                  />
                </div>

                {/* Swap — press S */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={swap}
                    title="Swap units (S)"
                    className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all hover:shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>

                {/* TO */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">To</label>
                  <div className="relative">
                    <select
                      value={toSym}
                      onChange={(e) => setToSym(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {cat.units.map(u => (
                        <option key={u.symbol} value={u.symbol}>
                          {u.name !== u.symbol ? `${u.symbol} — ${u.name}` : u.symbol}
                        </option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="w-full px-3 py-3 border-2 border-blue-100 dark:border-blue-900 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-between gap-2 min-h-[54px]">
                    <span className="text-xl font-bold text-blue-700 dark:text-blue-300 font-mono break-all">{result}</span>
                    <span className="text-sm text-blue-500 dark:text-blue-400 flex-shrink-0 font-medium">{toSym}</span>
                  </div>
                </div>
              </div>

              {/* Factor line + actions */}
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {factorLine && fromUnit && toUnit && fromUnit.symbol !== toUnit.symbol ? (
                    <span className="font-mono">{factorLine}</span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">Select two different units</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyResult}
                    disabled={result === "—"}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {copied ? (
                      <><svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" /></svg> Copy result</>
                    )}
                  </button>
                  <button
                    onClick={shareLink}
                    title="Copy shareable link to clipboard"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {linkCopied ? (
                      <><svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Link copied!</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── All conversions grid ─────────────────────────────────────────── */}
          {hasInput && fromUnit && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                All {cat.name} conversions for {numInput} {fromSym}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {cat.units.map(u => {
                  const val    = f(fromBase(toBase(numInput, fromUnit), u));
                  const isFrom = u.symbol === fromSym;
                  const isTo   = u.symbol === toSym;
                  return (
                    <button
                      key={u.symbol}
                      onClick={() => !isFrom && setToSym(u.symbol)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isFrom
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 cursor-default"
                          : isTo
                          ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400 dark:ring-blue-500"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{u.symbol}</span>
                        {isFrom && <span className="text-xs text-gray-400">input</span>}
                        {isTo   && <span className="text-xs text-blue-500">selected</span>}
                      </div>
                      <p className="font-mono text-sm font-bold text-gray-900 dark:text-white leading-tight break-all">{isFrom ? numInput : val}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{u.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <References refs={REFS_CONVERTER} />
    </div>
  );
}
