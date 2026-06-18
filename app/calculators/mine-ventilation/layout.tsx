import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mine Ventilation Calculator — Airway Resistance & Fan Selection",
  description:
    "Calculate mine airway resistance using Atkinson's equation for rectangular, arched, circular, and square tunnels. Series and parallel circuits, fan operating point from H-Q curve, MHSA Reg. 5.15.1 diesel dilution compliance (0.06 m³/s per kW). Air density auto-computed from mine depth with auto-compression.",
  keywords: [
    "mine ventilation calculator",
    "Atkinson equation",
    "airway resistance calculator",
    "mine fan selection",
    "MHSA ventilation",
    "mine fan operating point",
    "underground mine ventilation",
    "South Africa mine ventilation",
    "diesel dilution MHSA",
    "mine airway resistance N s2 m8",
  ],
  openGraph: {
    title: "Mine Ventilation Calculator — Atkinson Airway Resistance & Fan Selection | Fluids Pad",
    description:
      "Atkinson's equation for mine airway resistance, series/parallel circuits, fan H-Q operating point, and MHSA Reg. 5.15.1 diesel dilution compliance. Built for South African mines.",
  },
  alternates: {
    canonical: "/calculators/mine-ventilation",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
