interface AssumptionsListProps {
  assumptions: string[];
  title?: string;
}

export function AssumptionsList({
  assumptions,
  title = "Assumptions",
}: AssumptionsListProps) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
        {title}
      </h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
        {assumptions.map((assumption, index) => (
          <li key={index}>{assumption}</li>
        ))}
      </ul>
    </div>
  );
}

