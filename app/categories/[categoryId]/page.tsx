import Link from "next/link";
import { allCalculators, getCalculatorsByCategory, getCategoryById, calculatorCategories } from "@/lib/calculator-data";
import { notFound } from "next/navigation";

interface Props { params: Promise<{ categoryId: string }> }

const CAT_ACCENT: Record<string, { border: string; badge: string; text: string; glowClass: string }> = {
  "fluid-mechanics-i":    { border: "border-l-blue-500",   badge: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",   text: "text-blue-600 dark:text-blue-400",   glowClass: "calc-glow-blue"   },
  "fluid-mechanics-ii":   { border: "border-l-green-500",  badge: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300", text: "text-green-600 dark:text-green-400", glowClass: "calc-glow-green"  },
  "dimensional-analysis": { border: "border-l-purple-500", badge: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",text: "text-purple-600 dark:text-purple-400", glowClass: "calc-glow-gray" },
  "heat-mass-transfer":   { border: "border-l-orange-500", badge: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",text: "text-orange-600 dark:text-orange-400", glowClass: "calc-glow-orange" },
  "open-channel":         { border: "border-l-teal-500",   badge: "bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300",   text: "text-teal-600 dark:text-teal-400",   glowClass: "calc-glow-teal"   },
  "compressible-flow":    { border: "border-l-red-500",    badge: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",       text: "text-red-600 dark:text-red-400",     glowClass: "calc-glow-red"    },
  "turbomachinery":       { border: "border-l-indigo-500", badge: "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300",text: "text-indigo-600 dark:text-indigo-400", glowClass: "calc-glow-indigo" },
  "pipe-networks":        { border: "border-l-cyan-500",   badge: "bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300",   text: "text-cyan-600 dark:text-cyan-400",   glowClass: "calc-glow-cyan"   },
};

const LEVEL_STYLE: Record<string, string> = {
  Fundamental: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  Applied:     "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  Specialized: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
};

export default async function CategoryPage({ params }: Props) {
  const { categoryId } = await params;
  const category = getCategoryById(categoryId);
  if (!category) notFound();

  const calculators = getCalculatorsByCategory(categoryId);
  const s = CAT_ACCENT[categoryId] ?? { border: "border-l-gray-400", badge: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400", text: "text-gray-600", glowClass: "calc-glow-gray" };
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/calculators" className="hover:text-gray-900 dark:hover:text-white transition-colors">Calculators</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">{category.name}</span>
      </div>

      {/* Header */}
      <div className={`border-l-4 ${s.border} pl-5 mb-8`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{category.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl">{category.description}</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <div className="text-center px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-black text-gray-900 dark:text-white">{calculators.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Calculators</p>
            </div>
          </div>
        </div>
      </div>

      {/* Other categories — compact horizontal scroll */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Other topics</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {calculatorCategories
            .filter((c) => c.id !== categoryId)
            .map((c) => {
              const a = CAT_ACCENT[c.id];
              const count = allCalculators.filter((calc) => calc.category === c.id && !calc.isDesignTool).length;
              return (
                <Link
                  key={c.id}
                  href={`/categories/${c.id}`}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300`}
                >
                  {c.name}
                  <span className="text-gray-400 dark:text-gray-500">{count}</span>
                </Link>
              );
            })}
        </div>
      </div>

      {/* Calculators grid */}
      {calculators.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500">No calculators in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {calculators.map((calc) => (
            <Link key={calc.href} href={calc.href} className={`calc-card ${s.glowClass} group block rounded-xl`}>
              <div className={`h-full min-h-[160px] rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${s.border} bg-white dark:bg-gray-800 p-4 flex flex-col gap-2`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{calc.name}</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1 line-clamp-2">{calc.description}</p>
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100 dark:border-gray-700">
                  {calc.level && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_STYLE[calc.level] ?? ""}`}>{calc.level}</span>
                  )}
                  <span className={`ml-auto text-xs font-medium ${s.text} flex items-center gap-0.5 group-hover:gap-1 transition-all`}>
                    Open
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
