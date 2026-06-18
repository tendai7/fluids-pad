"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { HistoryTracker } from "@/components/HistoryTracker";

export default function CalculatorsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const showBack = pathname !== "/calculators";

  return (
    <div>
      <HistoryTracker />
      {showBack && (
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-5 transition-colors"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Calculators
        </button>
      )}
      {children}
    </div>
  );
}
