"use client";

import React from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeKeyGen() {
  let k = 0;
  return () => k++;
}

// Splits text on word_subscript tokens (Q_actual → Q<sub>actual</sub>).
// Base pattern is [A-Za-z][A-Za-z0-9]* so the underscore is never part of
// the base, keeping Q_actual_flow → Q<sub>actual</sub>_flow predictable.
// Matches ASCII letters AND the Greek letters commonly used in fluid mechanics
// so that ρ_w, μ_L, σ_y etc. are rendered as proper subscripts alongside V_1, Re_D etc.
const SUB_SPLIT = /([A-Za-zα-ωΑ-Ωρμνσητεγβδθλφω][A-Za-z0-9α-ωΑ-Ω]*_[A-Za-z0-9]+)/g;
const SUB_MATCH = /^([A-Za-zα-ωΑ-Ωρμνσητεγβδθλφω][A-Za-z0-9α-ωΑ-Ω]*)_([A-Za-z0-9]+)$/;

function applySubscripts(text: string, genKey: () => number): React.ReactNode[] {
  const parts = text.split(SUB_SPLIT);
  return parts.flatMap((part) => {
    if (!part) return [];
    const m = part.match(SUB_MATCH);
    if (m) {
      return [
        <span key={genKey()}>
          {m[1]}<sub className="text-[0.7em]">{m[2]}</sub>
        </span>,
      ];
    }
    const plain = part
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/(?<![A-Za-z0-9])_([^_\n]+?)_(?![A-Za-z0-9])/g, "$1");
    return plain ? [<span key={genKey()}>{plain}</span>] : [];
  });
}

// Inline renderer: strips $…$, renders **bold**, converts word_sub notation,
// and renders [text](url) markdown links safely without dangerouslySetInnerHTML.
export function renderInline(text: string): React.ReactNode[] {
  const cleaned = text
    .replace(/\$\$([^$]+?)\$\$/g, (_, m) => m)
    .replace(/\$([^$\n]+?)\$/g, (_, m) => m);

  const genKey = makeKeyGen();
  const result: React.ReactNode[] = [];

  // Split on **bold** and [text](url) patterns
  const tokens = cleaned.split(/(\*\*[^*\n]+?\*\*|\[[^\]]+\]\([^)]+\))/g);

  for (const token of tokens) {
    const bold = token.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      result.push(
        <strong key={genKey()} className="font-semibold">
          {applySubscripts(bold[1], genKey)}
        </strong>
      );
      continue;
    }

    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      result.push(
        <a
          key={genKey()}
          href={link[2]}
          className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
        >
          {link[1]}
        </a>
      );
      continue;
    }

    if (token) result.push(...applySubscripts(token, genKey));
  }

  return result;
}

// Renders a block of pipe-delimited markdown table lines as an HTML table.
function renderTable(tableLines: string[], baseKey: number): React.ReactNode {
  const isSep = (l: string) => /^\|[\s\-:|]+\|$/.test(l.trim());
  const rows = tableLines
    .filter((l) => !isSep(l))
    .map((l) =>
      l.trim().replace(/^\|/, "").replace(/\|$/, "")
        .split("|").map((c) => c.trim())
    )
    .filter((r) => r.some((c) => c.length > 0));

  if (rows.length === 0) return null;
  const [headers, ...dataRows] = rows;

  return (
    <div key={baseKey} className="overflow-x-auto my-2">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-600">
            {headers.map((h, i) => (
              <th key={i} className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
              {row.map((cell, ci) => (
                <td key={ci} className={`py-1.5 pr-4 text-xs ${ci === 0 ? "text-gray-500 dark:text-gray-400" : "font-mono text-gray-800 dark:text-gray-200"}`}>
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── FormattedText ────────────────────────────────────────────────────────────
// Block renderer for streamed AI text. Handles:
//   ## / ###   → bold section header
//   1. / 2.    → numbered steps with coloured index
//   - / *      → bullet list
//   | … |      → markdown table
//   **bold**   → <strong>
//   [t](url)   → anchor link
//   $…$ $$…$$  → content without delimiters
//   word_sub   → word<sub>sub</sub>

export function FormattedText({ text, loading }: { text: string; loading: boolean }) {
  if (!text && loading) {
    return (
      <span className="inline-flex gap-1">
        <span className="animate-bounce">·</span>
        <span className="animate-bounce [animation-delay:0.1s]">·</span>
        <span className="animate-bounce [animation-delay:0.2s]">·</span>
      </span>
    );
  }
  if (!text) return null;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;
  const tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const node = renderTable([...tableBuffer], key++);
      if (node) nodes.push(node);
      tableBuffer.length = 0;
    }
  };

  for (const raw of lines) {
    if (/^\|.+\|/.test(raw.trim())) {
      tableBuffer.push(raw);
      continue;
    }
    flushTable();

    if (raw.trim() === "") {
      if (nodes.length > 0) nodes.push(<div key={key++} className="h-2" />);
      continue;
    }

    const hMatch = raw.match(/^#{1,3}\s+(.+)/);
    if (hMatch) {
      nodes.push(
        <p key={key++} className="font-semibold text-gray-900 dark:text-white mt-3 mb-0.5">
          {renderInline(hMatch[1])}
        </p>
      );
      continue;
    }

    const numMatch = raw.match(/^(\d+)[.)]\s+(.+)/);
    if (numMatch) {
      nodes.push(
        <div key={key++} className="flex gap-2.5 items-start">
          <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs mt-0.5 w-5 flex-shrink-0 text-right">
            {numMatch[1]}.
          </span>
          <span className="flex-1 leading-relaxed">{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    const bulletMatch = raw.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      nodes.push(
        <div key={key++} className="flex gap-2 items-start">
          <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">•</span>
          <span className="flex-1 leading-relaxed">{renderInline(bulletMatch[1])}</span>
        </div>
      );
      continue;
    }

    nodes.push(
      <p key={key++} className="leading-relaxed">{renderInline(raw)}</p>
    );
  }

  flushTable();

  return <div className="space-y-0.5">{nodes}</div>;
}
