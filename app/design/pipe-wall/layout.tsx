import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipe Wall Thickness Calculator — ASME B31.3 & B31.1",
  description:
    "Calculate minimum required pipe wall thickness per ASME B31.3 (process piping) and B31.1 (power piping). Covers 9 ASME material groups, schedule selection, MAWP, hydrostatic test pressure, mill tolerance, corrosion allowance, and indicative ZAR cost. PDF and CSV export.",
  keywords: [
    "pipe wall thickness calculator",
    "ASME B31.3 calculator",
    "ASME B31.1 pipe thickness",
    "process piping design",
    "MAWP calculation",
    "pipe schedule calculator",
    "hydrostatic test pressure",
    "pipe wall thickness South Africa",
    "pressure piping design calculator",
    "SA-516 pipe thickness",
  ],
  openGraph: {
    title: "Pipe Wall Thickness Calculator — ASME B31.3 & B31.1 | Fluids Pad",
    description:
      "ASME B31.3/B31.1 minimum pipe wall thickness, schedule selection, MAWP, hydrostatic test, and ZAR cost estimate. 9 ASME material groups. PDF and CSV export.",
  },
  alternates: {
    canonical: "/design/pipe-wall",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
