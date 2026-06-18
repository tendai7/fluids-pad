import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipe Head Loss Calculator — Darcy-Weisbach & Colebrook-White",
  description:
    "Calculate pipe friction head loss using Darcy-Weisbach with Colebrook-White friction factor. Inputs: pipe diameter, length, flow rate, fluid properties. Outputs: velocity, Reynolds number, friction factor, head loss in metres and kPa.",
  keywords: [
    "pipe head loss calculator",
    "Darcy Weisbach calculator",
    "Colebrook White calculator",
    "pipe friction loss",
    "head loss calculator",
    "pipe flow pressure drop",
    "hydraulic gradient calculator",
  ],
  openGraph: {
    title: "Pipe Head Loss — Darcy-Weisbach Calculator | Fluids Pad",
    description:
      "Darcy-Weisbach pipe head loss with Colebrook-White friction factor. Reynolds number, velocity, head loss in metres and kPa.",
  },
  alternates: { canonical: "/calculators/pipe-head-loss" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
