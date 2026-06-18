"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Thin top-bar progress indicator that appears during client-side navigation.
// usePathname() changes when the route finishes loading — so we show the bar
// immediately on click (via a global click listener on <a> tags) and hide it
// when the pathname confirms the navigation completed.
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Navigation just completed — hide the bar
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    // Intercept any internal link click to show the bar immediately
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("#")) return;
      if (href !== pathname) setVisible(true);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden pointer-events-none"
    >
      <div className="h-full bg-sky-500 animate-[nprogress_1.4s_ease-in-out_infinite]" />
      <style>{`
        @keyframes nprogress {
          0%   { width: 0%;  margin-left: 0;    }
          60%  { width: 80%; margin-left: 0;    }
          100% { width: 5%;  margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
