import Link from "next/link";
import { Card } from "@/components/Card";
import { allCalculators, calculatorCategories } from "@/lib/calculator-data";
import { formulas } from "@/lib/formula-data";

export default function AboutPage() {
  return (
    <div className="w-full space-y-12">

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          About Fluids Pad
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
          A complete engineering toolkit built for students who want to understand fluid mechanics — not just get answers.
          Every calculator shows the full working. Every formula is properly typeset. Every concept is explained.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Calculators",       value: String(allCalculators.length) },
          { label: "Equations",         value: String(formulas.length) },
          { label: "Topics",            value: String(calculatorCategories.length) },
          { label: "Unit categories",   value: "24" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center">
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* What's inside */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What&apos;s inside</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-5">Eight topics covering the full undergraduate fluid mechanics curriculum.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {calculatorCategories.map((cat) => {
            const count = allCalculators.filter(c => c.category === cat.id).length;
            return (
              <Link key={cat.id} href={`/categories/${cat.id}`} className="group block">
                <div className="h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat.name}</h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{count} calculators</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{cat.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Key features */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Step-by-step solutions",
              desc: "Every calculator shows the complete working — formula, substitution, intermediate values, and final result. Not just the number.",
            },
            {
              title: "KaTeX equation rendering",
              desc: "All 100 equations and step-by-step calculations are typeset with KaTeX for proper mathematical notation — subscripts, superscripts, Greek letters.",
            },
            {
              title: "Exam sheet builder",
              desc: "Select any combination of equations, add your course code and exam name, and print a clean single-page reference sheet.",
            },
            {
              title: "Practice problems with tutor",
              desc: "Adaptive practice problems at your chosen difficulty — with progressive hints, full worked solutions, and a contextual tutor you can ask questions at any step.",
            },
            {
              title: "Unit converter",
              desc: "24 categories and 185 units covering all common engineering quantities — pressure, viscosity, thermal conductivity, rotational speed, and more.",
            },
            {
              title: "Reference tables",
              desc: "Fluid properties for water and air across temperature ranges, pipe roughness values, minor loss coefficients, and dimensionless number summaries.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-blue-600 dark:bg-blue-700 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Ready to use it?</h2>
        <p className="text-blue-100 mb-6 text-sm">Start with the most fundamental calculators or jump straight into your topic.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/calculators" className="px-5 py-2.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm">
            Browse Calculators
          </Link>
          <Link href="/formulas" className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm">
            Exam Sheet Builder
          </Link>
          <Link href="/practice" className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm">
            Practice Problems
          </Link>
        </div>
      </div>

    </div>
  );
}
