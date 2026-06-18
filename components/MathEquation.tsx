/**
 * Renders equation strings using KaTeX with automatic conversion from
 * our Unicode/custom-notation format to LaTeX.
 */
import katex from "katex";

// ─── Unicode → LaTeX conversion ───────────────────────────────────────────────
function toLatex(raw: string): string {
  return raw
    // ── Named math functions (before any letter replacements) ──────────────
    .replace(/\btanh\b/g, "\\tanh")
    .replace(/\bsinh\b/g, "\\sinh")
    .replace(/\bcosh\b/g, "\\cosh")
    .replace(/\btan\b/g, "\\tan")
    .replace(/\bsin\b/g, "\\sin")
    .replace(/\bcos\b/g, "\\cos")
    .replace(/\bln\b/g, "\\ln")
    .replace(/\blog\b/g, "\\log")
    .replace(/\bexp\b/g, "\\exp")
    .replace(/\bmax\b/g, "\\max")
    .replace(/\bmin\b/g, "\\min")
    .replace(/\barctan\b/g, "\\arctan")
    .replace(/\barcsin\b/g, "\\arcsin")
    .replace(/\barccos\b/g, "\\arccos")

    // ── Dot-notation / combining characters ───────────────────────────────
    .replace(/ṁ/g, "\\dot{m}")
    .replace(/ẇ/g, "\\dot{w}")
    .replace(/Ẇ/g, "\\dot{W}")
    .replace(/ȳ/g, "\\bar{y}")
    .replace(/V̄/g, "\\bar{V}")

    // ── Unicode SUPERSCRIPT MINUS + DIGIT pairs (e.g. Pa⁻¹, m⁻²) ───────────
    .replace(/⁻⁰/g, "^{-0}")
    .replace(/⁻¹/g, "^{-1}")
    .replace(/⁻²/g, "^{-2}")
    .replace(/⁻³/g, "^{-3}")
    .replace(/⁻⁴/g, "^{-4}")
    .replace(/⁻⁵/g, "^{-5}")
    .replace(/⁻⁶/g, "^{-6}")
    .replace(/⁻⁷/g, "^{-7}")
    .replace(/⁻⁸/g, "^{-8}")
    .replace(/⁻⁹/g, "^{-9}")
    .replace(/⁻/g, "^{-}")   // standalone superscript minus

    // ── Unicode SUPERSCRIPT DIGITS (e.g. V², β⁴, m³) ─────────────────────
    .replace(/⁰/g, "^{0}")
    .replace(/¹/g, "^{1}")
    .replace(/²/g, "^{2}")
    .replace(/³/g, "^{3}")
    .replace(/⁴/g, "^{4}")
    .replace(/⁵/g, "^{5}")
    .replace(/⁶/g, "^{6}")
    .replace(/⁷/g, "^{7}")
    .replace(/⁸/g, "^{8}")
    .replace(/⁹/g, "^{9}")

    // ── Unicode SUBSCRIPT DIGITS (e.g. P₁, A₂) ───────────────────────────
    .replace(/₀/g, "_{0}")
    .replace(/₁/g, "_{1}")
    .replace(/₂/g, "_{2}")
    .replace(/₃/g, "_{3}")
    .replace(/₄/g, "_{4}")
    .replace(/₅/g, "_{5}")
    .replace(/₆/g, "_{6}")
    .replace(/₇/g, "_{7}")
    .replace(/₈/g, "_{8}")
    .replace(/₉/g, "_{9}")

    // ── Greek lowercase ────────────────────────────────────────────────────
    .replace(/ρ/g, "\\rho ")
    .replace(/μ/g, "\\mu ")
    .replace(/ν/g, "\\nu ")
    .replace(/σ/g, "\\sigma ")
    .replace(/γ/g, "\\gamma ")
    .replace(/β/g, "\\beta ")
    .replace(/α/g, "\\alpha ")
    .replace(/θ/g, "\\theta ")
    .replace(/ε/g, "\\varepsilon ")
    .replace(/η/g, "\\eta ")
    .replace(/ω/g, "\\omega ")
    .replace(/δ/g, "\\delta ")
    .replace(/π/g, "\\pi ")
    .replace(/ψ/g, "\\psi ")
    .replace(/φ/g, "\\phi ")
    .replace(/τ/g, "\\tau ")
    .replace(/λ/g, "\\lambda ")
    .replace(/ζ/g, "\\zeta ")
    .replace(/ξ/g, "\\xi ")

    // ── Greek uppercase ────────────────────────────────────────────────────
    .replace(/Δ/g, "\\Delta ")
    .replace(/Ω/g, "\\Omega ")
    .replace(/Σ/g, "\\Sigma ")
    .replace(/Φ/g, "\\Phi ")
    .replace(/Γ/g, "\\Gamma ")
    .replace(/Λ/g, "\\Lambda ")

    // ── Math operators and symbols ─────────────────────────────────────────
    .replace(/·/g, "\\cdot ")
    .replace(/⋅/g, "\\cdot ")
    .replace(/×/g, "\\times ")
    .replace(/−/g, "-")
    .replace(/≈/g, "\\approx ")
    .replace(/≤/g, "\\leq ")
    .replace(/≥/g, "\\geq ")
    .replace(/≠/g, "\\neq ")
    .replace(/∞/g, "\\infty ")
    .replace(/∇/g, "\\nabla ")
    .replace(/∂/g, "\\partial ")
    .replace(/°/g, "^{\\circ}")
    .replace(/→/g, "\\rightarrow ")
    .replace(/←/g, "\\leftarrow ")
    .replace(/∫/g, "\\int ")
    .replace(/∑/g, "\\sum ")

    // ── Star notation: A* → A^{*} (throat/sonic area in compressible flow) ─
    .replace(/([A-Za-z])\*/g, "$1^{*}")

    // ── Square roots: √(...) first, then √{...}, then √single-token ────────
    .replace(/√\(([^)]*)\)/g, "\\sqrt{$1}")
    .replace(/√\{([^}]*)\}/g, "\\sqrt{$1}")
    .replace(/√([A-Za-z0-9_^{}*]+)/g, "\\sqrt{$1}")

    // ── Percent sign — must be escaped in KaTeX math mode ─────────────────
    .replace(/%/g, "\\%")

    // ── Clean up spacing artifacts ─────────────────────────────────────────
    .replace(/ _/g, "_")
    .replace(/ \^/g, "^")
    .replace(/  +/g, " ")
    .trim();
}

// ─── Component ────────────────────────────────────────────────────────────────
interface MathEquationProps {
  eq: string;
  display?: boolean;
  className?: string;
}

export function MathEquation({ eq, display = false, className = "" }: MathEquationProps) {
  const latex = toLatex(eq);
  let html: string;
  try {
    html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: display,
      output: "html",
      trust: false,         // disallows \href, \url, and other unsafe commands
      strict: "warn",       // log unknown commands; don't silently swallow them
      maxExpand: 1000,      // prevent DoS via recursive macro expansion
    });
  } catch {
    // Fallback: escape eq before injecting into HTML to prevent XSS
    const safe = eq
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    html = `<span style="font-family:monospace;font-size:0.9em">${safe}</span>`;
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
