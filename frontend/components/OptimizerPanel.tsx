"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import DomainCard from "./DomainCard";
import { api } from "@/lib/api";
import type { WeatherData } from "@/types";
import {
  Play, RotateCcw, Target, DollarSign, Repeat, AlertCircle, Loader2, Wand2,
  BrainCircuit, Shield, Gauge, Eye, CheckCircle, MapPin, Thermometer, CloudRain,
} from "lucide-react";
import clsx from "clsx";

export default function OptimizerPanel() {
  const {
    runAutoFix,
    globalState,
    domains,
    selectedDomainIds,
    toggleDomain,
    selectAllDomains,
    clearDomainSelection,
    budget,
    setBudget,
    maxIterations,
    setMaxIterations,
    targetNCV,
    setTargetNCV,
    policyMode,
    setPolicyMode,
    systemMode,
    setSystemMode,
    relaxationEnabled,
    setRelaxationEnabled,
    runOptimization,
    previewResult,
    approvedActionIds,
    setApprovedActionIds,
    approvePreviewActions,
    resetState,
    isOptimizing,
    optimizationError,
    weather,
  } = useStore();

  const snapshots = globalState?.domains ?? [];
  const [whatIfTemp, setWhatIfTemp] = useState(weather?.temperature ?? 25);
  const [whatIfRain, setWhatIfRain] = useState(weather?.precipitation ?? 5);

  const whatIfNCV = useMemo(() => {
    const base = globalState?.global_ncv ?? 0;
    const tempPressure = Math.max(0, whatIfTemp - 25) * 0.35;
    const rainPressure = Math.max(0, 5 - whatIfRain) * 0.55;
    const budgetRelief = Math.min(12, budget / 25000);
    return Math.max(0, Math.min(100, base + tempPressure + rainPressure - budgetRelief));
  }, [budget, globalState?.global_ncv, whatIfRain, whatIfTemp]);

  const toggleApproved = (id: string) => {
    if (approvedActionIds.includes(id)) {
      setApprovedActionIds(approvedActionIds.filter((a) => a !== id));
    } else {
      setApprovedActionIds([...approvedActionIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Domain Selection */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Choose Areas To Improve</h2>
          <div className="flex gap-2">
            <button
              onClick={selectAllDomains}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              All
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={clearDomainSelection}
              className="text-xs text-slate-400 hover:text-slate-300"
            >
              None
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshots.map((snap) => (
            <DomainCard
              key={snap.domain_id}
              snapshot={snap}
              isSelected={selectedDomainIds.includes(snap.domain_id)}
              onToggle={() => toggleDomain(snap.domain_id)}
              showCheckbox
            />
          ))}
        </div>
        {selectedDomainIds.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            {selectedDomainIds.length} domain{selectedDomainIds.length > 1 ? "s" : ""} selected
          </p>
        )}
      </section>

      {/* Parameters */}
      <section className="bg-slate-800/95 border border-slate-600/70 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white mb-4">Plan Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Budget */}
          <div>
            <label className="flex items-center gap-1.5 text-sm text-slate-300 mb-2">
              <DollarSign className="w-3.5 h-3.5" />
              Budget (USD)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              min={1000}
              step={1000}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
            />
            <p className="text-sm text-slate-300 mt-1">${budget.toLocaleString()}</p>
          </div>

          {/* Max Steps */}
          <div>
            <label className="flex items-center gap-1.5 text-sm text-slate-300 mb-2">
              <Repeat className="w-3.5 h-3.5" />
              Max Steps
            </label>
            <input
              type="range"
              value={maxIterations}
              onChange={(e) => setMaxIterations(Number(e.target.value))}
              min={10}
              max={200}
              step={10}
              className="w-full accent-brand-500"
            />
            <p className="text-sm text-slate-300 mt-1">{maxIterations} steps</p>
          </div>

          {/* Target Risk Score */}
          <div>
            <label className="flex items-center gap-1.5 text-sm text-slate-300 mb-2">
              <Target className="w-3.5 h-3.5" />
              Target Risk Score
            </label>
            <input
              type="range"
              value={targetNCV}
              onChange={(e) => setTargetNCV(Number(e.target.value))}
              min={0}
              max={50}
              step={1}
              className="w-full accent-brand-500"
            />
            <p className="text-sm text-slate-300 mt-1">
              {targetNCV === 0 ? "Lower as much as possible" : `Keep at or below ${targetNCV}`}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-sm text-slate-300 mb-2">
              <Gauge className="w-3.5 h-3.5" />
              Speed vs Cost
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["cost_efficient", "fast_recovery"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSystemMode(mode)}
                  className={clsx(
                    "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                    systemMode === mode ? "bg-brand-700 border-brand-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400"
                  )}
                >
                  {mode === "cost_efficient" ? "Cost-efficient" : "Fast recovery"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-sm text-slate-300 mb-2">
              <Shield className="w-3.5 h-3.5" />
              Action Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["conservative", "balanced", "aggressive"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPolicyMode(mode)}
                  className={clsx(
                    "px-2 py-2 rounded-lg text-xs font-medium border capitalize transition-colors",
                    policyMode === mode ? "bg-brand-700 border-brand-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-4">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={relaxationEnabled}
                onChange={(e) => setRelaxationEnabled(e.target.checked)}
                className="accent-brand-500"
              />
              Flexible limits
            </label>
            <p className="text-sm text-slate-300 mt-2">
              Allow up to 20% extra budget if strict limits block progress.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Scenario Check</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Slider label="Temperature" icon={<Thermometer className="w-3.5 h-3.5" />} value={whatIfTemp} setValue={setWhatIfTemp} min={0} max={45} unit="C" />
            <Slider label="Rainfall" icon={<CloudRain className="w-3.5 h-3.5" />} value={whatIfRain} setValue={setWhatIfRain} min={0} max={40} unit="mm" />
            <div className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-700">
              <p className="text-sm text-slate-300">Projected Risk Score</p>
              <p className={clsx("text-2xl font-bold", whatIfNCV > 50 ? "text-red-300" : whatIfNCV > 25 ? "text-yellow-300" : "text-green-300")}>
                {whatIfNCV.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <LocationCompare />
      </section>

      {/* Error */}
      {optimizationError && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{optimizationError}</p>
        </div>
      )}

      {/* System identity label */}
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5">
        <BrainCircuit className="w-4 h-4 text-brand-400 shrink-0" />
        <p className="text-xs text-slate-300 font-medium">
          We recommend practical actions using your current data.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => runOptimization({ previewOnly: true })}
          disabled={isOptimizing || selectedDomainIds.length === 0}
          className={clsx(
            "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all",
            isOptimizing || selectedDomainIds.length === 0
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
          )}
        >
          <Eye className="w-4 h-4" />
          Preview Plan
        </button>

        {/* Auto-Fix System */}
        <button
          onClick={runAutoFix}
          disabled={isOptimizing}
          className={clsx(
            "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all",
            isOptimizing
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-700 to-brand-600 hover:from-purple-600 hover:to-brand-500 text-white shadow-lg shadow-purple-900/40"
          )}
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Auto Plan
            </>
          )}
        </button>

        <button
          onClick={() => runOptimization()}
          disabled={isOptimizing || selectedDomainIds.length === 0}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
            isOptimizing || selectedDomainIds.length === 0
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/50"
          )}
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Optimizing…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Build Plan
            </>
          )}
        </button>

        <button
          onClick={resetState}
          disabled={isOptimizing}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset State
        </button>
      </div>

      {previewResult && (
        <section className="bg-slate-800 border border-brand-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Human Approval Queue</h3>
              <p className="text-xs text-slate-400">
                Found {previewResult.actions_taken.length} suggested action{previewResult.actions_taken.length === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setApprovedActionIds(previewResult.actions_taken.map((a) => a.action_id))}
                className="text-xs text-brand-300 hover:text-brand-200"
              >
                Approve all
              </button>
              <button
                onClick={() => setApprovedActionIds([])}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {previewResult.actions_taken.map((action, index) => (
              <label key={`${action.action_id}-${index}`} className="flex items-start gap-3 bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={approvedActionIds.includes(action.action_id)}
                  onChange={() => toggleApproved(action.action_id)}
                  className="mt-1 accent-brand-500"
                />
                <span className="min-w-0">
                  <span className="block text-sm text-white font-medium truncate">{action.action_name}</span>
                  <span className="block text-xs text-slate-400">
                    {action.domain_name} · Risk drop {action.ncv_reduction.toFixed(2)} · ${action.actual_cost.toLocaleString()}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={() => approvePreviewActions(approvedActionIds)}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-semibold"
          >
            <CheckCircle className="w-4 h-4" />
            Run Selected Actions
          </button>
        </section>
      )}
    </div>
  );
}

function Slider({
  label, icon, value, setValue, min, max, unit,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
        {icon}
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
      <p className="text-xs text-slate-500 mt-1">{value}{unit}</p>
    </div>
  );
}

function LocationCompare() {
  const [cities, setCities] = useState("London, Mumbai, Nairobi");
  const [rows, setRows] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(false);

  const compare = async () => {
    const names = cities.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 3);
    setLoading(true);
    try {
      const data = await Promise.all(names.map((city) => api.getWeather(city)));
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-white">Multi-location Comparison</h3>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          value={cities}
          onChange={(e) => setCities(e.target.value)}
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        />
        <button onClick={compare} className="px-3 py-2 bg-brand-700 hover:bg-brand-600 rounded-lg text-xs font-semibold text-white">
          {loading ? "..." : "Compare"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {rows.map((row) => {
          const risk = Math.min(100, Math.max(0, row.temperature * 0.8 + Math.max(0, 10 - row.precipitation) * 1.4));
          return (
            <div key={row.city} className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
              <p className="text-sm font-semibold text-white truncate">{row.city}</p>
              <p className="text-xs text-slate-400">{row.temperature}C · {row.precipitation}mm</p>
              <p className={clsx("text-xs font-semibold mt-1", risk > 35 ? "text-yellow-300" : "text-green-300")}>
                Risk score {risk.toFixed(0)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
