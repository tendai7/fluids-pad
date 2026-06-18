import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { CALC_TOOLS, TOOL_LABELS, executeTool } from "@/lib/calculator-tools";
import { captureError } from "@/lib/monitoring";

// ── Rate limiting ─────────────────────────────────────────────────────────────
//
// PRIMARY (when configured): Upstash Redis — distributed, persists across all
//   serverless instances, works correctly at any concurrency level.
//
// FALLBACK (no env vars): In-memory Map — works within a single warm instance
//   but resets on cold starts and doesn't share state across instances.
//
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
// to activate the distributed limiter (free at upstash.com).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazily initialised — avoids import errors when env vars are absent
let _upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  if (_upstashLimiter) return _upstashLimiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  try {
    _upstashLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, "1 h"), // 30 requests / IP / hour
      analytics: false,
      prefix: "fm_ai",
    });
    return _upstashLimiter;
  } catch {
    return null;
  }
}

// Fallback: in-memory (single instance only)
const _ipMap = new Map<string, { count: number; resetAt: number }>();
const _WINDOW_MS = 60 * 60 * 1000;
const _IP_LIMIT  = 30;

function checkIpLimitMemory(ip: string): boolean {
  const now = Date.now();
  // Lazy eviction: prevent unbounded growth in long-lived warm instances
  if (_ipMap.size > 1000) {
    for (const [key, rec] of _ipMap) {
      if (now > rec.resetAt) _ipMap.delete(key);
    }
  }
  const rec = _ipMap.get(ip);
  if (!rec || now > rec.resetAt) { _ipMap.set(ip, { count: 1, resetAt: now + _WINDOW_MS }); return true; }
  if (rec.count >= _IP_LIMIT) return false;
  rec.count++;
  return true;
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; source: string }> {
  const limiter = getUpstashLimiter();
  if (limiter) {
    const { success } = await limiter.limit(ip);
    return { allowed: success, source: "upstash" };
  }
  return { allowed: checkIpLimitMemory(ip), source: "memory" };
}

// ── Anthropic client ──────────────────────────────────────────────────────────
const client = new Anthropic();

// ── Friendly error messages for known Anthropic error conditions ──────────────
function friendlyAnthropicError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) {
    return "The AI tutor is busy — the rate limit has been reached. Please wait a minute and try again.";
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return "The AI request timed out. Please try again.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Could not connect to the AI service. Please check your connection and try again.";
  }
  if (err instanceof Anthropic.InternalServerError) {
    const status = (err as { status?: number }).status;
    if (status === 529) {
      return "Anthropic's servers are temporarily overloaded. Please try again in a few seconds.";
    }
    return "The AI service returned an error. Please try again shortly.";
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return "AI service configuration error. Please contact support.";
  }
  // Log unexpected errors server-side, show generic message to user
  console.error("[AI stream unexpected error]", err instanceof Error ? err.message : err);
  return "Something went wrong with the AI tutor. Please try again.";
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert fluid mechanics tutor and engineering assistant built into the Fluids Pad app. You have deep knowledge of all 102 calculators available in this app, covering:

**Fluid Mechanics I:** Reynolds Number, Continuity Equation, Bernoulli Equation, Hydrostatic Pressure, Pipe Flow Rate, Manometer, Buoyancy, Torricelli's Theorem, Pitot Tube, Velocity Head, Mass Flow Rate, Static/Dynamic/Total Pressure, Flow Work, Area Ratio, Energy Loss

**Fluid Mechanics II:** Pipe Head Loss, Friction Factor, Minor Losses, Pump Power, Poiseuille Flow, Orifice Flow, Venturi Flow, Drag on Sphere, Stokes Law, Mach Number, Lift Force, Boundary Layer Thickness, Non-Circular Duct, Momentum Flux, Control Volume Force, Vortex Flow, Swirl Number, Discharge Coefficient, Flow/Pressure Coefficient, Cavitation Number, Pressure Recovery, Energy Loss

**Dimensional Analysis:** Froude Number, Weber Number, Euler Number, Strouhal Number

**Heat & Mass Transfer:** Nusselt, Prandtl, Grashof, Rayleigh, Peclet, Schmidt, Sherwood, Lewis Numbers, Surface Tension, Capillary Rise, LMTD, Overall HTC, Dittus-Boelter, Natural Convection Plate, Effectiveness-NTU, Fouling Factor, Fin Efficiency, Thermal Resistance

**Compressible Flow:** Speed of Sound, Isentropic Relations, Normal Shock, Stagnation Properties, Choked Flow, Area-Mach Relation, Fanno Flow, Rayleigh Flow, Oblique Shock, Prandtl-Meyer Expansion

**Turbomachinery:** Pump Head (Euler), NPSH, Specific Speed, Affinity Laws, Hydraulic Efficiency, Turbine Power, Fan Laws, Impeller Tip Speed, Suction Specific Speed

**Pipe Networks:** Series Pipe, Parallel Pipe, Water Hammer, Colebrook-White, Swamee-Jain, Hazen-Williams, Pipe Sizing, Hydraulic Gradient

**Open Channel Flow:** Manning's Equation, Critical Depth, Hydraulic Jump, Weir Flow, Specific Energy, Normal Depth, Chezy Equation, Hydraulic/Wetted Perimeter, Flow Classification, Trapezoidal Channel, Culvert Design, Sediment Transport, Gradually Varied Flow, Tidal Prism

When suggesting a calculator, format the link as: [Calculator Name](/calculators/calculator-slug) — use kebab-case slugs matching the URLs above.

**Modes:**
- **solve**: User describes a problem. Identify the relevant calculator(s), explain the approach step-by-step, suggest which inputs to use and in what order.
- **explain**: User gives you a calculation result. Explain the physics behind it, what it means practically, and potential follow-up analyses.
- **practice**: Generate a realistic engineering practice problem. Include a scenario, given data, and what to find. Do NOT solve it — just set up the problem.
- **chat**: General fluid mechanics Q&A. Be concise and link to relevant calculators when helpful.

Always be educational. Use proper notation (Re, ρ, μ, etc.). Keep responses focused and under 400 words unless the problem genuinely requires more.`;

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Rate limit check — runs before any API cost is incurred
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { allowed, source } = await checkRateLimit(ip);

    if (!allowed) {
      return Response.json(
        {
          error: "Too many requests. You have made more than 30 AI requests this hour. Please wait before trying again.",
          retryAfter: 3600,
        },
        {
          status: 429,
          headers: { "Retry-After": "3600", "X-RateLimit-Source": source },
        }
      );
    }

    const { message, mode = "chat", context, history = [], image, imageType, useTools = false } = await req.json();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    // Cap text field sizes — without this, a script can inflate per-request
    // input-token cost arbitrarily while staying under the request-count rate limit.
    const MAX_MESSAGE_CHARS = 8_000;
    const MAX_CONTEXT_CHARS = 4_000;
    const MAX_HISTORY_ITEM_CHARS = 12_000; // generous enough for a full prior solution/feedback reply

    if (message.length > MAX_MESSAGE_CHARS) {
      return Response.json({ error: "message is too long." }, { status: 400 });
    }
    if (context !== undefined && (typeof context !== "string" || context.length > MAX_CONTEXT_CHARS)) {
      return Response.json({ error: "context is too long." }, { status: 400 });
    }

    // Reject oversized image payloads — base64 of 5 MB binary is ~6.67 MB chars.
    // 6_800_000 enforces a strict ≤5 MB binary limit (6.8M / 1.333 ≈ 5.1 MB).
    const MAX_IMAGE_CHARS = 6_800_000;
    if (image && (typeof image !== "string" || image.length > MAX_IMAGE_CHARS)) {
      return Response.json(
        { error: "Image is too large. Please use an image under 5 MB." },
        { status: 413 }
      );
    }

    const modeInstruction =
      mode === "solve"
        ? "The user has a problem to solve. Identify the right calculator(s) and walk them through the approach."
        : mode === "explain"
        ? "The user wants an explanation of a calculation result. Explain the physics and practical significance."
        : mode === "practice"
        ? "Generate a realistic engineering practice problem. Include a scenario, given data, and what to find. Do NOT solve it — just set up the problem."
        : "Answer the fluid mechanics question helpfully and concisely.";

    const currentContent = context
      ? `Context: ${context}\n\nQuestion: ${message}`
      : message;

    const sanitised: HistoryMessage[] = (Array.isArray(history) ? history : [])
      .filter((m: unknown): m is HistoryMessage => {
        if (typeof m !== "object" || m === null) return false;
        const msg = m as HistoryMessage;
        return (
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0 &&
          msg.content.length <= MAX_HISTORY_ITEM_CHARS
        );
      })
      .slice(-20);

    type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    const safeImageType: ImageMediaType =
      (["image/jpeg", "image/png", "image/webp", "image/gif"] as ImageMediaType[]).includes(imageType)
        ? imageType
        : "image/jpeg";

    const userContent = image
      ? [
          {
            type: "image" as const,
            source: { type: "base64" as const, media_type: safeImageType, data: image as string },
          },
          { type: "text" as const, text: `[Mode: ${mode}] ${modeInstruction}\n\n${currentContent}` },
        ]
      : `[Mode: ${mode}] ${modeInstruction}\n\n${currentContent}`;

    const encoder = new TextEncoder();

    function emitError(controller: ReadableStreamDefaultController, msg: string) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }

    async function pipeStream(
      stream: Awaited<ReturnType<typeof client.messages.stream>>,
      controller: ReadableStreamDefaultController
    ) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
        }
      }
    }

    const shouldUseTools = useTools && !image;

    type ContentBlock = Anthropic.Messages.ContentBlock;
    type MessageParam = Anthropic.Messages.MessageParam;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (shouldUseTools) {
            let messages: MessageParam[] = [
              ...sanitised,
              { role: "user", content: userContent as string },
            ];

            for (let round = 0; round < 5; round++) {
              const response = await client.messages.create({
                model: "claude-sonnet-4-6",
                max_tokens: 1024,
                system: SYSTEM_PROMPT,
                // CALC_TOOLS is `as const` (readonly tuple); SDK expects mutable Tool[].
                // Shape matches exactly — the double cast is the only way to widen readonly → mutable.
                tools: CALC_TOOLS as unknown as Anthropic.Messages.Tool[],
                tool_choice: { type: "auto" },
                messages,
              });

              if (response.stop_reason !== "tool_use") {
                const textBlock = response.content.find(
                  (b): b is Anthropic.Messages.TextBlock => b.type === "text"
                );
                if (textBlock?.text) {
                  const words = textBlock.text.split(" ");
                  const CHUNK = 8;
                  for (let i = 0; i < words.length; i += CHUNK) {
                    const piece = words.slice(i, i + CHUNK).join(" ") + (i + CHUNK < words.length ? " " : "");
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: piece })}\n\n`));
                  }
                } else {
                  const finalStream = await client.messages.stream({
                    model: "claude-sonnet-4-6",
                    max_tokens: 2048,
                    system: SYSTEM_PROMPT,
                    messages: [
                      ...messages,
                      { role: "assistant", content: response.content },
                    ],
                  });
                  await pipeStream(finalStream, controller);
                }
                break;
              }

              const toolUseBlocks = response.content.filter(
                (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
              );

              for (const tb of toolUseBlocks) {
                const label = TOOL_LABELS[tb.name] ?? tb.name;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "tool_call", name: tb.name, label })}\n\n`)
                );
              }

              const toolResults: Anthropic.Messages.ToolResultBlockParam[] = toolUseBlocks.map((tb) => ({
                type: "tool_result" as const,
                tool_use_id: tb.id,
                // tb.input is `unknown` per SDK types; Claude always returns a JSON object here
                content: executeTool(tb.name, tb.input as Record<string, unknown>),
              }));

              messages = [
                ...messages,
                { role: "assistant" as const, content: response.content as ContentBlock[] },
                { role: "user" as const, content: toolResults },
              ];
            }
          } else {
            const stream = await client.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 2048,
              system: SYSTEM_PROMPT,
              messages: [
                ...(image ? [] : sanitised),
                { role: "user", content: userContent },
              ],
            });
            await pipeStream(stream, controller);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

        } catch (streamErr: unknown) {
          captureError(streamErr, { route: "/api/ai", phase: "stream" });
          // Map Anthropic error types to user-friendly messages
          emitError(controller, friendlyAnthropicError(streamErr));
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-RateLimit-Source": source,
      },
    });

  } catch (error) {
    console.error("AI route error:", error);
    captureError(error, { route: "/api/ai", phase: "request" });
    return Response.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
