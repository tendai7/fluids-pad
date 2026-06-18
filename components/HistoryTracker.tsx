"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { allCalculators } from "@/lib/calculator-data";
import { logVisit } from "@/lib/calculator-history";

export function HistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const calc = allCalculators.find((c) => c.href === pathname);
    if (!calc) return;
    logVisit({
      calculatorName: calc.name,
      href:           calc.href,
      category:       calc.category,
      level:          calc.level,
    });
  }, [pathname]);

  return null;
}
