"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_HYDROSTATIC } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateHydrostatic,
  generateHydrostaticSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

export default function HydrostaticCalculator() {
  const [depth, setDepth] = useState("1");
  const [density, setDensity] = useState("1000");
  const [atmosphericPressure, setAtmosphericPressure] = useState("101325");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateHydrostatic> | null>(null);
  const [steps, setSteps] = useState<ReturnType<typeof generateHydrostaticSteps> | null>(null);

  const handleClear = () => {
    setDepth("");
    setDensity("");
    setAtmosphericPressure("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    setErrors({});
    const depthNum = parseFloat(depth);
    const densityNum = parseFloat(density);
    const atmNum = parseFloat(atmosphericPressure);

    if (isNaN(depthNum) || depthNum < 0) {
      setErrors({ depth: "Depth must be non-negative" });
      return;
    }
    if (isNaN(densityNum) || densityNum <= 0) {
      setErrors({ density: "Density must be positive" });
      return;
    }
    if (isNaN(atmNum) || atmNum <= 0) {
      setErrors({ atmosphericPressure: "Atmospheric pressure must be positive" });
      return;
    }

    try {
      const calculatedResult = calculateHydrostatic({
        depth: depthNum,
        density: densityNum,
        atmosphericPressure: atmNum,
      });
      const calculatedSteps = generateHydrostaticSteps({
        depth: depthNum,
        density: densityNum,
        atmosphericPressure: atmNum,
      }, calculatedResult);
      setResult(calculatedResult);
      setSteps(calculatedSteps);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "Calculation error" });
      setResult(null);
      setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hydrostatic Pressure Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate pressure at depth in a static fluid using hydrostatic pressure equation.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Depth"
            symbol="h"
            unit="m"
            value={depth}
            onChange={setDepth}
            error={errors.depth}
          />
          <InputField
            label="Fluid density"
            symbol="ρ"
            unit="kg/m³"
            value={density}
            onChange={setDensity}
            error={errors.density}
          />
          <InputField
            label="Atmospheric pressure"
            symbol="Pₐₜₘ"
            unit="Pa"
            value={atmosphericPressure}
            onChange={setAtmosphericPressure}
            error={errors.atmosphericPressure}
          />
        </div>
        {errors.general && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        )}
        <button
          onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
        >
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {result && steps && (() => {
        const atm = parseFloat(atmosphericPressure) || 101325;
        const gauge = result.gaugePressure;
        const abs   = result.absolutePressure;
        const fmt   = (n: number, sig = 4) => parseFloat(n.toPrecision(sig)).toString();

        const units: [string, number][] = [
          ["Pa",    gauge],
          ["kPa",   gauge / 1000],
          ["bar",   gauge / 100000],
          ["psi",   gauge / 6894.76],
          ["atm",   gauge / 101325],
          ["m H₂O", gauge / 9810],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary result */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Gauge pressure (ρgh)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(gauge, 6)} Pa
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(gauge / 1000, 6)} kPa
                </p>
              </div>

              {/* Pressure composition */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Pressure composition
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Atmospheric", value: atm,   color: "text-gray-700 dark:text-gray-200" },
                    { label: "Gauge (ρgh)", value: gauge, color: "text-blue-600 dark:text-blue-400" },
                    { label: "Absolute",   value: abs,   color: "text-gray-900 dark:text-white font-bold" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className={`font-mono text-sm ${color}`}>{fmt(value / 1000, 5)} kPa</p>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/40 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    P<sub>atm</sub> + P<sub>gauge</sub> = P<sub>abs</sub>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    {fmt(atm / 1000, 5)} + {fmt(gauge / 1000, 5)} = {fmt(abs / 1000, 6)} kPa
                  </p>
                </div>
              </div>

              {/* Unit conversions for gauge pressure */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Gauge pressure in other units
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {units.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.hydrostatic} />
              <CommonMistakes mistakes={commonMistakes.hydrostatic} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Main Equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              P = ρgh
            </div>
          </div>
          <p>
            Hydrostatic pressure increases linearly with depth in a static fluid. The pressure
            at any point is due to the weight of the fluid above it.
          </p>
        </div>
      </Card>

      <References refs={REFS_HYDROSTATIC} />
    </div>
  );
}

