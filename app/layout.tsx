import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { NavBar } from "@/components/NavBar";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { CookieConsent } from "@/components/CookieConsent";
import { FooterEmailSignup } from "@/components/FooterEmailSignup";
import { NavigationProgress } from "@/components/NavigationProgress";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://fluidmechanicscompanion.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),

  title: {
    default: "Fluids Pad — Free Engineering Calculators for Fluid Mechanics",
    template: "%s | Fluids Pad",
  },

  description:
    "Free engineering calculators for fluid mechanics — pipe flow, pumps, heat transfer, compressible flow, and 60+ more tools, for engineers and students everywhere. Plus South Africa-specific tools: SANRAL stormwater, mine ventilation, ECSA-relevant standards, and ZAR cost estimation.",

  keywords: [
    "fluid mechanics calculator",
    "engineering calculator South Africa",
    "pipe flow calculator",
    "slurry pipeline calculator",
    "mine ventilation calculator",
    "Durand Condolios calculator",
    "Atkinson equation mine airway",
    "ASME B31.3 pipe wall thickness",
    "Reynolds number calculator",
    "Darcy Weisbach calculator",
    "control valve sizing IEC 60534",
    "pressure vessel ASME VIII",
    "stormwater rational method South Africa",
    "SANRAL IDF calculator",
    "ECSA CPD engineering tools",
    "pump system curve calculator",
    "compressor power calculator",
    "heat exchanger NTU calculator",
    "Colebrook White friction factor",
    "hydraulic jump calculator",
  ],

  authors: [{ name: "Fluids Pad" }],
  creator: "Fluids Pad",
  publisher: "Fluids Pad",

  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: BASE,
    siteName: "Fluids Pad",
    title: "Fluids Pad — Free Engineering Calculators for Fluid Mechanics",
    description:
      "60+ free calculators for engineers and students — pipe flow, pumps, heat transfer, compressible flow, and more. Plus South Africa-specific tools: SANRAL stormwater, mine ventilation, ECSA-relevant standards, and ZAR cost estimation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fluids Pad — Engineering Calculators",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Fluids Pad — Engineering Calculators",
    description:
      "60+ free calculators for engineers and students — pipe flow, pumps, heat transfer, compressible flow, and more. Plus South Africa-specific tools like mine ventilation and stormwater design.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: BASE,
  },
};

// JSON-LD structured data for the site
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      url: BASE,
      name: "Fluids Pad",
      description:
        "Free engineering calculators for fluid mechanics — pipe flow, slurry pipelines, mine ventilation, pressure vessels, and more, for engineers and students everywhere. Includes South Africa-specific tools.",
      inLanguage: "en-ZA",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE}/calculators?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE}/#app`,
      name: "Fluids Pad",
      url: BASE,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "ZAR",
      },
      description:
        "60+ interactive fluid mechanics calculators for engineers and students. Covers pipe flow, slurry pipelines, mine ventilation, compressible flow, heat transfer, open-channel hydraulics, and more.",
      featureList: [
        "Slurry pipeline Durand-Condolios calculator",
        "Mine ventilation Atkinson airway resistance",
        "ASME B31.3 pipe wall thickness",
        "IEC 60534 control valve sizing",
        "ASME VIII pressure vessel design",
        "SANRAL IDF stormwater rational method",
        "Pump system curve and parallel operation",
        "Darcy-Weisbach with Colebrook-White friction factor",
        "ZAR cost estimation",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "Engineers and engineering students",
      },
    },
    {
      "@type": "Organization",
      "@id": `${BASE}/#org`,
      name: "Fluids Pad",
      url: BASE,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <head>
        {/* Dark-mode flash prevention — must run before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <GoogleAnalytics />
        <NavigationProgress />
        <FeedbackWidget />
        <NavBar />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer style={{ background: "linear-gradient(135deg, #0c2340 0%, #0c3d5e 100%)" }}>
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">

            {/* Main footer row — brand left | links center | signup right */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10">

              {/* Brand */}
              <div className="flex-shrink-0">
                <p className="text-base font-bold text-white mb-1">
                  Fluids <span className="text-sky-400">Pad</span>
                </p>
                <p className="text-xs text-sky-300/50 max-w-[180px] leading-relaxed">
                  Referenced engineering calculations for students and working engineers.
                </p>
              </div>

              {/* Links — utility pages not prominent in the main navbar */}
              <div className="flex-1 flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs text-sky-300/60">
                {[
                  { label: "History",       href: "/history"   },
                  { label: "Practice",      href: "/practice"  },
                  { label: "Formula Sheet", href: "/formulas"  },
                  { label: "Converter",     href: "/converter" },
                  { label: "Tables",        href: "/tables"    },
                ].map((l) => (
                  <a key={l.href} href={l.href} className="hover:text-sky-200 transition-colors">
                    {l.label}
                  </a>
                ))}
              </div>

              {/* Email signup — right */}
              <div className="flex-shrink-0 w-52">
                <FooterEmailSignup dark />
              </div>

            </div>

            {/* Legal strip */}
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-col items-center gap-2 text-center">
              <div className="flex gap-6 text-[11px] text-sky-300/50">
                <a href="/about"   className="hover:text-sky-200 transition-colors">About</a>
                <a href="/terms"   className="hover:text-sky-200 transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-sky-200 transition-colors">Privacy</a>
              </div>
              <p className="text-[10px] text-sky-300/30 leading-relaxed">
                A calculator is a starting point, not a stamp.
              </p>
            </div>

          </div>
        </footer>
        <CookieConsent />
      </body>
    </html>
  );
}
