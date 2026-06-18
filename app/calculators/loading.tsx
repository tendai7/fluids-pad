// Shown instantly when navigating to /calculators while the page hydrates.
export default function CalculatorsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Search bar skeleton */}
      <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />

      {/* Filter row skeleton */}
      <div className="flex gap-3">
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-36" />
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-28" />
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl w-24 ml-auto" />
      </div>

      {/* Card grid skeleton — 12 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl border-l-4 border-gray-300 dark:border-gray-600"
          />
        ))}
      </div>
    </div>
  );
}
