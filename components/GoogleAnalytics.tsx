"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { getStoredConsent, CONSENT_EVENT, type ConsentValue } from "./CookieConsent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  const [consent, setConsent] = useState<ConsentValue>(null);

  useEffect(() => {
    // Read existing consent on mount
    setConsent(getStoredConsent());

    // Listen for consent changes (when user clicks Accept/Decline in banner)
    function onConsentChange(e: Event) {
      setConsent((e as CustomEvent<ConsentValue>).detail);
    }
    window.addEventListener(CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_EVENT, onConsentChange);
  }, []);

  // Only load GA if user accepted AND a measurement ID is configured
  if (!GA_ID || consent !== "accepted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            send_page_view: true,
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
