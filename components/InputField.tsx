import React from "react";

interface InputFieldProps {
  label: string;
  symbol?: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: "number" | "text";
  step?: string;
  readOnly?: boolean;
  hint?: string;
}

export function InputField({
  label,
  symbol,
  unit,
  value,
  onChange,
  placeholder,
  error,
  type = "number",
  step = "any",
  readOnly = false,
  hint,
}: InputFieldProps) {
  const labelText = symbol ? `${label} ${symbol} (${unit})` : `${label} (${unit})`;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {labelText}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none dark:border-gray-600 dark:text-white ${
          readOnly
            ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-default"
            : `focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 ${error ? "border-red-500" : "border-gray-300"}`
        }`}
      />
      {hint && (
        <p className="mt-0.5 text-xs text-blue-500 dark:text-blue-400">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
