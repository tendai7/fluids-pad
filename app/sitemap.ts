import { MetadataRoute } from "next";
import { allCalculators } from "@/lib/calculator-data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://fluidmechanicscompanion.com";

const DESIGN_PAGES = [
  "/design/pipe-system",
  "/design/control-valve",
  "/design/stormwater",
  "/design/pressure-vessel",
  "/design/pipe-wall",
];

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE,                       priority: 1.0, changeFrequency: "weekly"  },
  { url: `${BASE}/calculators`,      priority: 0.9, changeFrequency: "weekly"  },
  { url: `${BASE}/design`,           priority: 0.9, changeFrequency: "weekly"  },
  { url: `${BASE}/formulas`,         priority: 0.7, changeFrequency: "monthly" },
  { url: `${BASE}/converter`,        priority: 0.6, changeFrequency: "monthly" },
  { url: `${BASE}/tables`,           priority: 0.6, changeFrequency: "monthly" },
  { url: `${BASE}/practice`,         priority: 0.6, changeFrequency: "monthly" },
  // /ai-assistant removed from navigation
  { url: `${BASE}/terms`,            priority: 0.2, changeFrequency: "yearly"  },
  { url: `${BASE}/privacy`,          priority: 0.2, changeFrequency: "yearly"  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const calculatorPages: MetadataRoute.Sitemap = allCalculators.map((c) => ({
    url: `${BASE}${c.href}`,
    lastModified: now,
    priority: c.isCore ? 0.8 : 0.6,
    changeFrequency: "monthly",
  }));

  const designPages: MetadataRoute.Sitemap = DESIGN_PAGES.map((href) => ({
    url: `${BASE}${href}`,
    lastModified: now,
    priority: 0.8,
    changeFrequency: "monthly",
  }));

  return [...STATIC_PAGES, ...calculatorPages, ...designPages];
}
