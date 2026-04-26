"use client";

import { ActionRecord } from "@/types";
import { TrendingDown, DollarSign, Zap } from "lucide-react";
import clsx from "clsx";

interface Props {
  actions: ActionRecord[];
  aiExplanations?: Record<string, string> | null;
  highlightIndex?: number;
}

export default function ActionLog({ actions, aiExplanations, highlightIndex }: Props) {
  if (!actions || actions.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-6">No actions taken</p>;
  }

  const grouped = actions.reduce<Record<string, ActionRecord[]>>((acc, action) => {
    acc[action.domain_name] = acc[action.domain_name] ?? [];
    acc[action.domain_name].push(action);
    return acc;
  }, {});

  let globalIndex = 0;

  return (
    <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
      {Object.entries(grouped).map(([domainName, group]) => (
        <div key={domainName}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{domainName}</p>
            <span className="text-xs text-slate-500">{group.length} action{group.length === 1 ? "" : "s"}</span>
          </div>
          <div className="space-y-2">
      {group.map((a) => {
        const i = globalIndex++;
        const isHighlighted = highlightIndex !== undefined && i === highlightIndex;

        return (
          <div
            key={i}
            className={clsx(
              "border rounded-xl p-4 transition-all duration-300",
              isHighlighted
                ? "bg-brand-900/40 border-brand-500 shadow-lg shadow-brand-900/20"
                : "bg-slate-800/60 border-slate-700"
            )}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={clsx(
                    "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                    isHighlighted ? "bg-brand-600 text-white" : "bg-slate-700 text-slate-400"
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{a.action_name}</p>
                  <p className="text-xs text-slate-400">
                    {a.domain_name} · Application #{a.application_number}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-xs text-green-400 flex items-center gap-1 justify-end">
                  <TrendingDown className="w-3 h-3" />
                  −{a.ncv_reduction.toFixed(2)} NCV
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                  <DollarSign className="w-3 h-3" />
                  ${a.actual_cost.toLocaleString()}
                </p>
                <p className="text-xs text-yellow-400 flex items-center gap-1 justify-end" title="Score = NCV_reduction / cost">
                  <Zap className="w-3 h-3" />
                  {(a.score * 1000).toFixed(3)}
                </p>
              </div>
            </div>

            {/* Effects */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.effects_applied.map((e, j) => (
                <span
                  key={j}
                  className={clsx(
                    "text-xs px-2 py-0.5 rounded-full",
                    e.delta_applied > 0
                      ? "bg-green-900/50 text-green-300"
                      : "bg-red-900/50 text-red-300"
                  )}
                >
                  {e.variable_name}: {e.delta_applied > 0 ? "+" : ""}{e.delta_applied.toFixed(1)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
          </div>
        </div>
      ))}
    </div>
  );
}

