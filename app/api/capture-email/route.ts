import { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { captureError } from "@/lib/monitoring";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Email submission: max 10 per hour per IP.
// Distributed via Upstash when configured; falls back to in-memory otherwise.

let _limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (_limiter) return _limiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  try {
    _limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "fm_email",
    });
    return _limiter;
  } catch { return null; }
}

const _memMap = new Map<string, { count: number; resetAt: number }>();
function memCheck(ip: string): boolean {
  const now = Date.now();
  // Lazy eviction: prevent unbounded growth in long-lived warm instances
  if (_memMap.size > 1000) {
    for (const [key, rec] of _memMap) {
      if (now > rec.resetAt) _memMap.delete(key);
    }
  }
  const rec = _memMap.get(ip);
  if (!rec || now > rec.resetAt) { _memMap.set(ip, { count: 1, resetAt: now + 3600000 }); return true; }
  if (rec.count >= 10) return false;
  rec.count++;
  return true;
}

async function isAllowed(ip: string): Promise<boolean> {
  const limiter = getLimiter();
  if (limiter) { const { success } = await limiter.limit(ip); return success; }
  return memCheck(ip);
}

// ── Mailchimp config ──────────────────────────────────────────────────────────
const MC_API_KEY = process.env.MAILCHIMP_API_KEY;
const MC_LIST_ID = process.env.MAILCHIMP_LIST_ID;

function mailchimpDC(): string {
  if (!MC_API_KEY) return "us1";
  const parts = MC_API_KEY.split("-");
  return parts[parts.length - 1] ?? "us1";
}

function isValidEmail(s: string): boolean {
  // Tighter than bare [^\s@]: enforces proper domain label format and at least one dot in domain
  return /^[^\s@]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (!(await isAllowed(ip))) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    const body = await req.json() as { email?: string; source?: string; tags?: string[] };
    const email  = (body.email ?? "").trim().toLowerCase();
    const source = (body.source ?? "website").slice(0, 80);
    // Validate each tag: alphanumeric + hyphen/underscore/space only, max 50 chars each
    const tags = Array.isArray(body.tags)
      ? body.tags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim().slice(0, 50))
          .filter((t) => /^[a-zA-Z0-9\-_\s]+$/.test(t))
          .slice(0, 10)
      : [];

    if (!email || !isValidEmail(email)) {
      return Response.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (MC_API_KEY && MC_LIST_ID) {
      const dc  = mailchimpDC();
      const url = `https://${dc}.api.mailchimp.com/3.0/lists/${MC_LIST_ID}/members`;

      const mcRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`anystring:${MC_API_KEY}`).toString("base64")}`,
        },
        body: JSON.stringify({
          email_address: email,
          status: "subscribed",
          tags: [source, ...tags].filter(Boolean),
          merge_fields: { SOURCE: source },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!mcRes.ok) {
        const data = await mcRes.json().catch(() => ({})) as { title?: string };
        const title = data?.title ?? "";
        if (!title.includes("Member Exists") && !title.includes("Forgotten Email")) {
          // Log only the error category, never the email address (POPIA)
          console.error("[capture-email] Mailchimp error:", title);
        }
      }

      return Response.json({ success: true, provider: "mailchimp" });
    }

    // No provider configured — succeed silently (email stored client-side via hook)
    // Do NOT log the email address — POPIA compliance
    console.info("[capture-email] No provider configured — subscription recorded client-side only.");
    return Response.json({ success: true, provider: "none" });

  } catch (err) {
    // Log the error type but never user data
    console.error("[capture-email] Error:", err instanceof Error ? err.message : "unknown");
    captureError(err, { route: "/api/capture-email" }); // never pass the email itself — POPIA
    return Response.json(
      { success: false, error: "Subscription service unavailable. Please try again later." },
      { status: 500 }
    );
  }
}
