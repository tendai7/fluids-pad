import React from "react";

interface CommonMistakesProps {
  mistakes: React.ReactNode[];
  title?: string;
}

export function CommonMistakes({
  mistakes,
  title = "Common mistakes",
}: CommonMistakesProps) {
  return (
    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <h3 className="text-base font-semibold mb-2 text-amber-800 dark:text-amber-300">
        {title}
      </h3>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
        {mistakes.map((mistake, index) =>
          typeof mistake === "string" ? (
            <li key={index} dangerouslySetInnerHTML={{ __html: mistake }} />
          ) : (
            <li key={index}>{mistake}</li>
          )
        )}
      </ul>
    </div>
  );
}

