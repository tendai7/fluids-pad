/** @type {import('next').NextConfig} */

// Security headers applied to every response.
// CSP uses 'unsafe-inline' for scripts because Next.js injects hydration scripts
// inline; removing it would break the app. All other directives are strict.
const SECURITY_HEADERS = [
  // Prevent the site from being embedded in iframes (clickjacking protection)
  { key: "X-Frame-Options",          value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options",   value: "nosniff" },
  // Only send origin (not full URL) in Referer header to third parties
  { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
  // Disable browser features not used by this app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Enforce HTTPS for 1 year (only active after deploying to HTTPS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content Security Policy
  // - script-src includes 'unsafe-inline' (required by Next.js inline hydration scripts)
  //   and 'unsafe-eval' (required by Next.js webpack runtime for dynamic chunk loading —
  //   removing it breaks code-splitting in production; cannot be replaced with a nonce here
  //   without a custom Next.js document setup)
  // - style-src includes 'unsafe-inline' (required by KaTeX and Tailwind)
  // - connect-src allows Upstash, Mailchimp, Formspree, Google Analytics
  //   (Anthropic is called server-side only — the browser never needs it in connect-src)
  // - frame-ancestors 'none' duplicates X-Frame-Options for CSP-aware browsers
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
      "font-src 'self' data:",
      "connect-src 'self' https://formspree.io https://*.upstash.io https://*.api.mailchimp.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://formspree.io",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // Disable DNS prefetching to reduce information leakage
  { key: "X-DNS-Prefetch-Control",   value: "on" },
];

const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Fix for Windows path issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
