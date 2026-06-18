import React from "react";
import { Card } from "./Card";

interface ResultsCardProps {
  title?: string;
  children: React.ReactNode;
}

export function ResultsCard({ title = "Results", children }: ResultsCardProps) {
  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        {title}
      </h2>
      {children}
    </Card>
  );
}

