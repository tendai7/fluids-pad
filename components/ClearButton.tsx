interface ClearButtonProps {
  onClear: () => void;
}

export function ClearButton({ onClear }: ClearButtonProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="mt-4 ml-2 px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-md transition-colors"
    >
      Clear
    </button>
  );
}
