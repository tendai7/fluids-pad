// Global route loading state.
// A thin top bar rather than a full-screen overlay — keeps the current page
// visible while the next one loads, so the wait feels shorter.
export default function Loading() {
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden"
    >
      <div className="h-full bg-sky-500 animate-[progress_1.2s_ease-in-out_infinite]" />
      <style>{`
        @keyframes progress {
          0%   { width: 0%;   margin-left: 0;    }
          50%  { width: 75%;  margin-left: 0;    }
          100% { width: 10%;  margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
