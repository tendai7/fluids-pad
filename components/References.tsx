"use client";

import React, { useState } from "react";
import type { Reference, RefType } from "@/lib/references";

const TYPE_STYLE: Record<RefType, { label: string; classes: string }> = {
  book:     { label: "Book",     classes: "bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300"   },
  journal:  { label: "Journal",  classes: "bg-green-100  dark:bg-green-900/40  text-green-700  dark:text-green-300"  },
  standard: { label: "Standard", classes: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  report:   { label: "Report",   classes: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
  online:   { label: "Online",   classes: "bg-gray-100   dark:bg-gray-700      text-gray-600   dark:text-gray-400"   },
};

interface Props {
  refs:         Reference[];
  defaultOpen?: boolean;
}

export function References({ refs, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (!refs || refs.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {/* Book icon */}
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-base font-bold text-gray-900 dark:text-white">References</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {open && (
        <ol className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-5">
          {refs.map((ref, i) => {
            const badge  = TYPE_STYLE[ref.type];
            const isUrl  = ref.details?.startsWith("http");

            return (
              <li key={i} className="flex gap-3">
                {/* Index */}
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0 space-y-1">
                  {/* Type badge */}
                  <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.classes}`}>
                    {badge.label}
                  </span>

                  {/* Citation */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <span className="font-semibold">{ref.authors}</span>
                    {" "}({ref.year}).{" "}
                    {ref.type === "book" || ref.type === "journal"
                      ? <em>{ref.title}.</em>
                      : <span>{ref.title}.</span>
                    }
                    {" "}
                    <span className="italic text-gray-500 dark:text-gray-400">{ref.source}.</span>
                    {ref.details && (
                      <>
                        {" "}
                        {isUrl
                          ? <a href={ref.details} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                              {ref.details}
                            </a>
                          : <span className="text-gray-500 dark:text-gray-400">{ref.details}.</span>
                        }
                      </>
                    )}
                  </p>

                  {/* Relevance note */}
                  {ref.note && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                      {ref.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
