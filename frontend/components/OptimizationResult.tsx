"use client";

import { useEffect, useState } from "react";
import { OptimizationResult as Result } from "@/types";
import NCVChart from "./NCVChart";
import StateComparisonChart from "./StateComparisonChart";
import ActionLog from "./ActionLog";
import NCVGauge from "./NCVGauge";
import { useStore } from "@/store/useStore";
import {
  CheckCircle, TrendingDown, DollarSign, Zap, Info,
  AlertTriangle, Lightbulb, BrainCircuit, Star,
  Activity, ShieldCheck, TimerReset, SlidersHorizontal, XCircle, ListChecks,
} from "lucide-react";
import clsx from "clsx";

interface Props { result: Result }

const STOP_LABELS: Record<string, string> = {
  target_reached: "Target NCV Reached",
  no_beneficial_action: "No More Beneficial Actions",
  budget_exhausted: "Budget Fully Used",
  max_iterations: "Max Iterations Reached",
};

const SDG_COLORS: Record<string, string> = {
  "2": "#DDA63A", "6": "#26BDE2", "7": "#FCC30B",
  "9": "#FD6925", "11": "#FD9D24", "12": "#BF8B2E",
  "13": "#3F7E44", "14": "#0A97D9", "15": "#56C02B",
};

export default function OptimizationResultComp({ result }: Props) {
  const { isAnimating, animationStep, animationHistory, advanceAnimation, stopAnimation } = useStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Drive animation timer
  useEffect(() => {
    if (!isAnimating) return;
    const t = setTimeout(() => advanceAnimation(), 280);
    return () => clearTimeout(t);
  }, [isAnimating, animationStep, advanceAnimation]);

  const animatedNCV = isAnimating && animationHistory.length > 0
    ? (animationHistory[animationStep] ?? result.final_ncv)
    : result.final_ncv;

  const currentActionIdx = isAnimating ? Math.max(0, animationStep - 1) : undefined;

  const isPartial = result.status === "PARTIAL";

  return (
    <div className="space-y-6 mt-6 text-slate-100">

      {/* ── Partial failure banner ── */}
      {isPartial && (
        <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-700 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">Partial Improvement — Status: PARTIAL</p>
            <p className="text-xs text-yellow-400 mt-0.5">
              {result.partial_message ?? "Constraints or budget prevented a full safe state."}
            </p>
          </div>
        </div>
      )}

      {/* ── Animated NCV gauge + summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-start">
        <div className="sm:col-span-1 flex flex-col items-center bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2">
            {isAnimating ? "Optimizing…" : "Final NCV"}
          </p>
          <div className="relative">
            <NCVGauge value={animatedNCV} size={120} label="NCV" />
          </div>
          {isAnimating && (
            <button
              onClick={stopAnimation}
              className="mt-2 text-xs text-slate-400 hover:text-white"
            >
              Skip
            </button>
          )}
        </div>

        <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            icon={<TrendingDown className="w-4 h-4 text-green-400" />}
            label="Risk Reduced"
            value={`−${result.ncv_reduction.toFixed(1)}`}
            sub={`${result.ncv_reduction_pct.toFixed(1)}% improvement`}
            accent="green"
          />
          <MetricCard
            icon={<DollarSign className="w-4 h-4 text-blue-400" />}
            label="Budget Used"
            value={`$${result.budget_used.toLocaleString()}`}
            sub={`$${result.budget_remaining.toLocaleString()} remaining`}
            accent="blue"
          />
          <MetricCard
            icon={<Zap className="w-4 h-4 text-yellow-400" />}
            label="Value For Money"
            value={(result.cost_efficiency * 1000).toFixed(3)}
            sub="Risk reduction per dollar"
            accent="yellow"
          />
          <MetricCard
            icon={<Star className="w-4 h-4 text-brand-400" />}
            label="Overall Progress"
            value={`${(result.total_improvement_score * 100).toFixed(1)}%`}
            sub={`${result.total_iterations} steps`}
            accent="brand"
          />
        </div>
      </div>

      {/* ── Before / After ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-300 mb-1">Starting Risk Score</p>
          <p className="text-3xl font-bold text-red-400">{result.initial_ncv.toFixed(1)}</p>
        </div>
        <div className={clsx("border rounded-xl p-4 text-center", isPartial ? "bg-yellow-900/10 border-yellow-800" : "bg-slate-800 border-slate-700")}>
          <p className="text-sm text-slate-300 mb-1">Final Risk Score</p>
          <p className={clsx("text-3xl font-bold", isPartial ? "text-yellow-300" : "text-green-400")}>
            {result.final_ncv.toFixed(1)}
          </p>
          <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block",
            isPartial ? "bg-yellow-900 text-yellow-300" : "bg-green-900 text-green-300"
          )}>
            {result.status}
          </span>
        </div>
      </div>

      {/* ── SDG impact mapping ── */}
      {showAdvanced && result.domains_optimized.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">SDG Impact Mapping</h3>
          <SDGMapping domainIds={result.domains_optimized} result={result} />
        </div>
      )}

      {/* ── Stop reason ── */}
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-600/70 rounded-lg px-4 py-3">
        <Info className="w-4 h-4 text-slate-400 shrink-0" />
        <p className="text-base text-slate-200">
          <span className="font-medium text-white">Why it stopped: </span>
          {STOP_LABELS[result.stopped_reason] ?? result.stopped_reason}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100"
        >
          {showAdvanced ? "Hide advanced details" : "Show advanced details"}
        </button>
      </div>

      {/* ── Optimization method + this-run trace ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4 text-brand-300" />
          <h3 className="text-sm font-semibold text-white">How This Plan Is Built</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-400">Step 1</p>
            <p className="text-sm text-slate-200 mt-1">Measure your current risk score and available budget/step limits.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-400">Step 2</p>
            <p className="text-sm text-slate-200 mt-1">Try each possible action virtually and estimate impact per cost.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-400">Step 3</p>
            <p className="text-sm text-slate-200 mt-1">Apply the best action, then repeat with the updated state.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-400">Step 4</p>
            <p className="text-sm text-slate-200 mt-1">Stop when the goal is reached or when no useful next action is possible.</p>
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-300">
          This run used <span className="text-white font-semibold">{result.total_iterations}</span> steps and selected <span className="text-white font-semibold">{result.actions_taken.length}</span> actions.
        </div>
      </div>

      {/* ── Addon decision intelligence ── */}
      {showAdvanced && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {result.top_factor && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-red-300" />
              <h3 className="text-sm font-semibold text-white">Top Factor</h3>
            </div>
            <p className="text-sm text-white">{result.top_factor.variable_name}</p>
            <p className="text-xs text-slate-400 mt-1">{result.top_factor.domain_name}</p>
            <p className="text-xs text-red-300 mt-2">Weighted violation {result.top_factor.weighted_violation.toFixed(3)}</p>
          </div>
        )}

        {result.decision_confidence && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-green-300" />
              <h3 className="text-sm font-semibold text-white">Decision Confidence</h3>
            </div>
            <ConfidenceBar label="Overall" value={result.decision_confidence.overall} />
            <ConfidenceBar label="Data reliability" value={result.decision_confidence.data_reliability} />
            <ConfidenceBar label="Model stability" value={result.decision_confidence.model_stability} />
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-300" />
            <h3 className="text-sm font-semibold text-white">Run Modes</h3>
          </div>
          <p className="text-xs text-slate-400">Weather city</p>
          <p className="text-sm text-white">{result.run_config?.weather_city ?? "London"}</p>
          <p className="text-xs text-slate-400">Policy</p>
          <p className="text-sm text-white capitalize">{result.run_config?.policy_mode ?? "balanced"}</p>
          <p className="text-xs text-slate-400 mt-2">System</p>
          <p className="text-sm text-white">{result.run_config?.system_mode === "fast_recovery" ? "Fast recovery" : "Cost-efficient"}</p>
          <p className="text-xs text-slate-500 mt-2">Effective budget ${result.run_config?.effective_budget.toLocaleString() ?? result.budget_total.toLocaleString()}</p>
        </div>
      </div>
      )}

      {showAdvanced && result.constraint_relaxation?.needed && (
        <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200">Constraint Relaxation Suggested</p>
            <p className="text-xs text-amber-300 mt-0.5">{result.constraint_relaxation.suggestion}</p>
          </div>
        </div>
      )}

      {showAdvanced && result.domain_impact_breakdown && result.domain_impact_breakdown.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Domain Impact Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.domain_impact_breakdown.map((row) => (
              <div key={row.domain_id} className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white truncate">{row.domain_name}</p>
                  <p className="text-xs text-green-300">+{row.improvement_pct.toFixed(1)}%</p>
                </div>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${Math.min(100, Math.max(0, row.improvement_pct))}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">{row.initial_ncv.toFixed(1)} to {row.final_ncv.toFixed(1)} NCV</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdvanced && result.trend_projection && result.trend_projection.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TimerReset className="w-4 h-4 text-blue-300" />
            <h3 className="text-sm font-semibold text-white">Trend Projection Without Action</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.trend_projection.map((row) => (
              <div key={row.period} className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                <p className="text-xs text-slate-400">{row.period}</p>
                <p className="text-2xl font-bold text-white">{row.projected_ncv.toFixed(1)}</p>
                <p className="text-xs text-slate-500">{row.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Report Summary ── */}
      {showAdvanced && (result.ai_report_summary || result.explanation) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit className="w-4 h-4 text-brand-400" />
            <p className="text-sm font-semibold text-white">
              {result.ai_report_summary ? "AI Report Summary" : "System Explanation"}
            </p>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {result.ai_report_summary ?? result.explanation}
          </p>
        </div>
      )}

      {/* ── AI Insights ── */}
      {showAdvanced && result.ai_insights && result.ai_insights.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <p className="text-sm font-semibold text-white">Key Insights</p>
          </div>
          <div className="space-y-2">
            {result.ai_insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-brand-900 text-brand-300 text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-300">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Suggestions ── */}
      {showAdvanced && result.ai_suggestions && result.ai_suggestions.length > 0 && (
        <div className="bg-slate-800 border border-brand-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-4 h-4 text-brand-300" />
            <p className="text-sm font-semibold text-white">AI Suggestions</p>
          </div>
          <div className="space-y-2">
            {result.ai_suggestions.map((suggestion, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NCV history chart ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Risk Score Over Steps</h3>
        <NCVChart history={result.ncv_history} />
      </div>

      {/* ── State comparison chart ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Before vs After Values</h3>
        <StateComparisonChart changes={result.variable_changes} height={320} />
      </div>

      {/* ── Actionable increase/reduce guidance ── */}
      {result.variable_changes && result.variable_changes.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">What To Increase vs Reduce</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.variable_changes
              .slice()
              .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
              .slice(0, 10)
              .map((row) => {
                const direction = row.change > 0 ? "Increase" : row.change < 0 ? "Reduce" : "Maintain";
                const badgeClass =
                  direction === "Increase"
                    ? "bg-emerald-900/60 text-emerald-200 border-emerald-700"
                    : direction === "Reduce"
                    ? "bg-amber-900/60 text-amber-200 border-amber-700"
                    : "bg-slate-700 text-slate-200 border-slate-600";
                return (
                  <div key={`${row.domain_id}-${row.variable_id}`} className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white font-medium truncate">{row.variable_name}</p>
                      <span className={clsx("text-xs px-2 py-0.5 rounded-full border font-semibold", badgeClass)}>
                        {direction}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{row.domain_name}</p>
                    <p className="text-xs text-slate-300 mt-2">
                      {row.initial_value.toFixed(2)} to {row.final_value.toFixed(2)} {row.unit}
                      {" "}
                      <span className="text-slate-500">({row.change >= 0 ? "+" : ""}{row.change.toFixed(2)})</span>
                    </p>
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Guidance is ranked by magnitude of change, so the most important adjustments appear first.
          </p>
        </div>
      )}

      {/* ── Detailed variable adjustments ── */}
      {result.variable_changes && result.variable_changes.some((v) => Math.abs(v.change) > 0.0001) && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Exact Changes By Variable</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="py-2 pr-3">Variable</th>
                  <th className="py-2 pr-3">Domain</th>
                  <th className="py-2 pr-3">Direction</th>
                  <th className="py-2 pr-3">Before</th>
                  <th className="py-2 pr-3">After</th>
                  <th className="py-2 pr-3">Delta</th>
                  <th className="py-2 pr-1">% Change</th>
                </tr>
              </thead>
              <tbody>
                {result.variable_changes
                  .filter((row) => Math.abs(row.change) > 0.0001)
                  .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
                  .map((row) => {
                    const direction = row.change > 0 ? "Increase" : "Reduce";
                    const pct = formatPctChange(row.initial_value, row.final_value);
                    return (
                      <tr key={`${row.domain_id}-${row.variable_id}`} className="border-b border-slate-800/80">
                        <td className="py-2 pr-3 text-slate-100 font-medium whitespace-nowrap">{row.variable_name}</td>
                        <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{row.domain_name}</td>
                        <td className="py-2 pr-3">
                          <span className={clsx(
                            "text-xs px-2 py-0.5 rounded-full border font-semibold",
                            row.change > 0
                              ? "bg-emerald-900/60 text-emerald-200 border-emerald-700"
                              : "bg-amber-900/60 text-amber-200 border-amber-700"
                          )}>
                            {direction}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{row.initial_value.toFixed(2)} {row.unit}</td>
                        <td className="py-2 pr-3 text-slate-100 whitespace-nowrap">{row.final_value.toFixed(2)} {row.unit}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span className={row.change > 0 ? "text-emerald-300" : "text-amber-300"}>
                            {row.change > 0 ? "+" : ""}{row.change.toFixed(2)} {row.unit}
                          </span>
                        </td>
                        <td className="py-2 pr-1 text-slate-300 whitespace-nowrap">{pct}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdvanced && result.sensitivity_analysis && result.sensitivity_analysis.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Sensitivity Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.sensitivity_analysis.slice(0, 6).map((row) => (
              <div key={`${row.domain_id}-${row.variable_id}`} className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white truncate">{row.variable_name}</p>
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full font-semibold", sensitivityClass(row.level))}>
                    {row.level}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{row.domain_name}</p>
                <p className="text-xs text-slate-500 mt-2">NCV change {row.delta_ncv.toFixed(2)} from slight variation</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action log with explainability ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Chosen Actions ({result.actions_taken.length})
          </h3>
          <span className="text-xs text-slate-500">Sorted by best impact for cost</span>
        </div>
        <ActionLog
          actions={result.actions_taken}
          aiExplanations={result.ai_action_explanations}
          highlightIndex={currentActionIdx}
        />
      </div>

      {showAdvanced && result.rejected_actions && result.rejected_actions.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-4 h-4 text-red-300" />
            <h3 className="text-sm font-semibold text-white">Rejected Actions</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {result.rejected_actions.slice(0, 12).map((action) => (
              <div key={action.action_id} className="bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white truncate">{action.action_name}</p>
                  <p className="text-xs text-slate-500">${action.cost.toLocaleString()}</p>
                </div>
                <p className="text-xs text-slate-400">{action.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfidenceBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-green-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function sensitivityClass(level: string) {
  if (level === "HIGH") return "bg-red-900/60 text-red-200";
  if (level === "MEDIUM") return "bg-yellow-900/60 text-yellow-200";
  return "bg-green-900/60 text-green-200";
}

function formatPctChange(initial: number, final: number) {
  if (Math.abs(initial) < 1e-9) return "N/A";
  const pct = ((final - initial) / Math.abs(initial)) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// ── SDG Mapping Component ──────────────────────────────────────────────────

const DOMAIN_SDG_MAP: Record<string, { sdgs: number[]; label: string }> = {
  water:       { sdgs: [6],       label: "Clean Water & Sanitation" },
  agriculture: { sdgs: [2, 15],   label: "Zero Hunger / Life on Land" },
  energy:      { sdgs: [7, 9, 13], label: "Clean Energy / Climate Action" },
  waste:       { sdgs: [12, 14],  label: "Responsible Consumption / Life Below Water" },
  smart_city:  { sdgs: [11, 3],   label: "Sustainable Cities / Good Health" },
};

function SDGMapping({ domainIds, result }: { domainIds: string[]; result: Result }) {
  return (
    <div className="flex flex-wrap gap-3">
      {domainIds.map((did) => {
        const meta = DOMAIN_SDG_MAP[did];
        const pct = result.ncv_reduction_pct;
        if (!meta) return null;
        return (
          <div key={did} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
            <div className="flex gap-1">
              {meta.sdgs.map((s) => (
                <span
                  key={s}
                  className="text-xs font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: SDG_COLORS[String(s)] ?? "#666" }}
                >
                  SDG {s}
                </span>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-white capitalize">{did.replace("_", " ")}</p>
              <p className="text-xs text-slate-400">{meta.label}</p>
            </div>
            <span className="text-xs text-green-400 ml-2 font-semibold">
              +{pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Metric Card ──────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: "green" | "blue" | "yellow" | "brand";
}) {
  const borders = {
    green: "border-green-500/20",
    blue: "border-blue-500/20",
    yellow: "border-yellow-500/20",
    brand: "border-brand-500/20",
  };
  return (
    <div className={`bg-slate-800 border ${borders[accent]} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-slate-400">{label}</span></div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}
