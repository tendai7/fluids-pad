"use client";

import React from "react";
import { MathEquation } from "@/components/MathEquation";
import type { Formula } from "@/lib/formula-data";
import type { FluidTable } from "@/lib/table-data";

export function groupByCategory(fs: Formula[]): { category: string; items: Formula[] }[] {
  const seen: string[] = [];
  const map: Record<string, Formula[]> = {};
  for (const f of fs) {
    if (!map[f.category]) { map[f.category] = []; seen.push(f.category); }
    map[f.category].push(f);
  }
  return seen.map((cat) => ({ category: cat, items: map[cat] }));
}

export function FormulaBlock({
  f, showDefinitions, onRemove,
}: { f: Formula; showDefinitions: boolean; onRemove?: () => void }) {
  return (
    <div style={{ breakInside: "avoid", pageBreakInside: "avoid", marginBottom: "10px", position: "relative" }}>
      {onRemove && (
        <button
          onClick={onRemove}
          className="no-print"
          style={{ position: "absolute", top: 0, right: 0, color: "#d1d5db", background: "none", border: "none", cursor: "pointer", fontSize: "13px", lineHeight: 1 }}
          title="Remove"
        >×</button>
      )}
      <div style={{ fontSize: "8pt", fontWeight: 700, color: "#111827", marginBottom: "1px", paddingRight: onRemove ? "14px" : 0, lineHeight: 1.2 }}>
        {f.name}
      </div>
      <div style={{ fontSize: "10pt", color: "#111827", marginBottom: showDefinitions && f.where.length > 0 ? "2px" : 0 }}>
        <MathEquation eq={f.equation} />
      </div>
      {showDefinitions && f.where.length > 0 && (
        <div style={{ fontSize: "6.5pt", color: "#111827", lineHeight: 1.4 }}>
          {f.where.map(([sym, desc], i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: "#374151", margin: "0 2px" }}>·</span>}
              <MathEquation eq={sym} />
              <span> — {desc}</span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export function TableBlock({ t }: { t: FluidTable }) {
  return (
    <div style={{ breakInside: "avoid", pageBreakInside: "avoid", marginBottom: "12px" }}>
      <div style={{ fontSize: "8.5pt", fontWeight: 800, color: "#111827", marginBottom: "2px" }}>{t.name}</div>
      {t.description && (
        <div style={{ fontSize: "6.5pt", color: "#374151", marginBottom: "3px" }}>{t.description}</div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7pt", color: "#111827" }}>
        <thead>
          <tr style={{ backgroundColor: "white" }}>
            {t.headers.map((h, i) => (
              <th key={i} style={{ padding: "2px 5px", border: "0.5px solid #111827", textAlign: i === 0 ? "left" : "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((row, ri) => (
            <tr key={ri} style={{ backgroundColor: "white" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "2px 5px", border: "0.5px solid #374151", textAlign: ci === 0 ? "left" : "right", whiteSpace: "nowrap" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {t.note && (
        <div style={{ fontSize: "6pt", color: "#374151", marginTop: "2px", fontStyle: "italic" }}>* {t.note}</div>
      )}
    </div>
  );
}

export interface SheetContentProps {
  formulas: Formula[];
  tables: FluidTable[];
  title: string;
  showDefinitions: boolean;
  groupCats: boolean;
  columns: 1 | 2 | 3;
  onRemoveFormula?: (idx: number) => void;
  onRemoveTable?: (id: string) => void;
}

export function SheetContent({
  formulas, tables, title, showDefinitions, groupCats, columns, onRemoveFormula, onRemoveTable,
}: SheetContentProps) {
  const today = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

  const colStyle: React.CSSProperties = { columnCount: columns, columnGap: "20px", columnFill: "balance" };

  const formulaSection = groupCats ? (
    <div>
      {groupByCategory(formulas).map(({ category, items }) => (
        <div key={category} style={{ marginBottom: "14px" }}>
          <div style={{
            fontSize: "8.5pt", fontWeight: 800, color: "#111827",
            borderBottom: "1.5px solid #374151", paddingBottom: "2px", marginBottom: "6px",
            textTransform: "uppercase", letterSpacing: "0.07em",
            breakAfter: "avoid", pageBreakAfter: "avoid",
          }}>
            {category}
          </div>
          <div style={colStyle}>
            {items.map((f, i) => (
              <FormulaBlock
                key={i} f={f} showDefinitions={showDefinitions}
                onRemove={onRemoveFormula ? () => onRemoveFormula(formulas.indexOf(f)) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div style={colStyle}>
      {formulas.map((f, i) => (
        <FormulaBlock
          key={i} f={f} showDefinitions={showDefinitions}
          onRemove={onRemoveFormula ? () => onRemoveFormula(i) : undefined}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #111", paddingBottom: "8px", marginBottom: "12px" }}>
        <div style={{ fontSize: "13pt", fontWeight: 900, textDecoration: "underline", textUnderlineOffset: "3px", color: "#111" }}>
          {title || "Relevant Equations & Tables"}
        </div>
        <div style={{ fontSize: "7pt", color: "#374151", marginTop: "2px" }}>
          {today}
          {formulas.length > 0 ? ` · ${formulas.length} equation${formulas.length !== 1 ? "s" : ""}` : ""}
          {tables.length > 0 ? ` · ${tables.length} table${tables.length !== 1 ? "s" : ""}` : ""}
        </div>
      </div>

      {/* Equations */}
      {formulaSection}

      {/* Tables */}
      {tables.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <div style={{
            fontSize: "8.5pt", fontWeight: 900, color: "#111827",
            borderBottom: "1.5px solid #374151", paddingBottom: "2px", marginBottom: "10px",
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            Reference Tables
          </div>
          {tables.map((t) => (
            <div key={t.id} style={{ position: "relative", marginBottom: "12px" }}>
              {onRemoveTable && (
                <button
                  onClick={() => onRemoveTable(t.id)}
                  className="no-print"
                  style={{ position: "absolute", top: 0, right: 0, color: "#d1d5db", background: "none", border: "none", cursor: "pointer", fontSize: "13px", lineHeight: 1 }}
                  title="Remove"
                >×</button>
              )}
              <TableBlock t={t} />
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #374151", marginTop: "12px", paddingTop: "4px", fontSize: "6.5pt", color: "#374151", textAlign: "center" }}>
        Fluids Pad
      </div>
    </>
  );
}
