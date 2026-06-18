// ─── Error monitoring (Sentry) ───────────────────────────────────────────────
//
// No-ops entirely until SENTRY_DSN is set — safe to ship before you've created
// a Sentry project. Server-only (API routes), not wired into client components.
// Get a DSN free at sentry.io → New Project → platform "Next.js".

import * as Sentry from "@sentry/node";

let initialised = false;

function ensureInit(): boolean {
  if (initialised) return true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({ dsn, tracesSampleRate: 0 });
  initialised = true;
  return true;
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!ensureInit()) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
