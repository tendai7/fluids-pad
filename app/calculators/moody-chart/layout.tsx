import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive Moody Chart — Friction Factor Calculator",
  description:
    "Plot your operating point on the Moody diagram. Enter Reynolds number and relative roughness ε/D to read the Darcy friction factor using the Colebrook-White equation. Includes laminar, transitional, and fully turbulent flow regime shading.",
  keywords: [
    "Moody chart calculator",
    "friction factor calculator",
    "Colebrook White equation",
    "Darcy friction factor",
    "Reynolds number friction factor",
    "pipe roughness friction factor",
    "Moody diagram online",
    "pipe flow friction",
  ],
  openGraph: {
    title: "Interactive Moody Chart — Darcy Friction Factor | Fluids Pad",
    description:
      "Enter Re and ε/D to plot your point on the Moody diagram. Reads Darcy friction factor via Colebrook-White with full flow regime shading.",
  },
  alternates: { canonical: "/calculators/moody-chart" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
