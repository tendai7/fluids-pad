import React from "react";
import { Step } from "@/lib/fluids";
import { MathEquation } from "@/components/MathEquation";

interface StepByStepProps {
  steps: Step[];
  title?: string;
}

export function StepByStep({ steps, title = "Step-by-step solution" }: StepByStepProps) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{title}</h3>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={index} className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
              <span className="font-semibold">Step {index + 1}:</span>{" "}
              <span dangerouslySetInnerHTML={{ __html: step.description }} />
            </p>

            {/* Formula — proper math notation */}
            {step.formula && (
              <div className="mt-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-center overflow-x-auto">
                <span className="text-sm text-gray-900 dark:text-white">
                  <MathEquation eq={step.formula} />
                </span>
              </div>
            )}

            {/* Calculation — substituted values with math rendering */}
            {step.calculation && (
              <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg overflow-x-auto">
                <span className="text-sm text-gray-900 dark:text-white">
                  <MathEquation eq={step.calculation} />
                </span>
              </div>
            )}

            {/* Result — math value; unit is always plain text */}
            {step.result && (
              <div className="mt-2 flex items-baseline gap-1.5 font-semibold text-gray-900 dark:text-white">
                <MathEquation eq={step.result} />
                {step.unit && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    [{step.unit}]
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
