import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Slurry Pipeline Calculator — Durand-Condolios & Wilson-GIW",
  description:
    "Calculate critical deposition velocity, heterogeneous slurry head loss, and Wilson-GIW pump de-rating for mining pipelines. Covers gold/platinum tailings, iron ore, coal, chrome, copper. Durand-Condolios (1952) methodology with Cv/Cw toggle, settling velocity, and pressure drop in kPa.",
  keywords: [
    "slurry pipeline calculator",
    "Durand Condolios calculator",
    "critical deposition velocity",
    "slurry head loss",
    "Wilson GIW pump de-rating",
    "mine tailings pipeline",
    "mineral processing calculator",
    "slurry transport South Africa",
    "heterogeneous slurry flow",
    "slurry pump sizing",
  ],
  openGraph: {
    title: "Slurry Pipeline Calculator — Durand-Condolios & Wilson-GIW | Fluids Pad",
    description:
      "Critical deposition velocity, slurry head loss, and pump de-rating for mining and mineral processing pipelines. 9 solid presets including gold, platinum, iron ore, coal, and chrome tailings.",
  },
  alternates: {
    canonical: "/calculators/slurry-pipeline",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
