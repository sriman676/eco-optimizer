"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";
import { DomainStateSnapshot, DomainStateVariable } from "@/types";
import clsx from "clsx";

interface Props {
  snapshot: DomainStateSnapshot;
  isSelected?: boolean;
  onToggle?: () => void;
  showCheckbox?: boolean;
}

export default function DomainCard({ snapshot, isSelected, onToggle, showCheckbox }: Props) {
  const ncv = snapshot.domain_ncv;

  const { borderColor, badgeColor, statusText } = useMemo(() => {
    if (ncv <= 20) return { borderColor: "border-green-500/40", badgeColor: "bg-green-900 text-green-300", statusText: "Safe" };
    if (ncv <= 50) return { borderColor: "border-yellow-500/40", badgeColor: "bg-yellow-900 text-yellow-300", statusText: "Moderate" };
    if (ncv <= 75) return { borderColor: "border-orange-500/40", badgeColor: "bg-orange-900 text-orange-300", statusText: "High Risk" };
    return { borderColor: "border-red-500/40", badgeColor: "bg-red-900 text-red-300", statusText: "Critical" };
  }, [ncv]);

  const violatingVars = snapshot.variables.filter((v) => v.violation > 0);

  return (
    <div
      className={clsx(
        "bg-slate-800/95 border rounded-xl p-5 transition-all duration-200",
        borderColor,
        showCheckbox && "cursor-pointer hover:bg-slate-700",
        isSelected && "ring-2 ring-brand-500 ring-offset-1 ring-offset-slate-900"
      )}
      onClick={showCheckbox ? onToggle : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {showCheckbox && (
            <div
              className={clsx(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                isSelected ? "border-brand-500 bg-brand-500" : "border-slate-600"
              )}
            >
              {isSelected && <span className="text-white text-xs">✓</span>}
            </div>
          )}
          <span className="text-2xl">{snapshot.domain_icon}</span>
          <div>
            <h3 className="text-base font-semibold text-white">{snapshot.domain_name}</h3>
            <div className="flex gap-1 mt-1 flex-wrap">
              {snapshot.sdg.map((s) => (
                <span key={s} className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                  SDG {s}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-white">{ncv.toFixed(1)}</div>
          <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", badgeColor)}>
            {statusText}
          </span>
        </div>
      </div>

      {/* NCV bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-slate-300 mb-1">
          <span>Risk Score (NCV)</span>
          <span>{ncv.toFixed(1)} / 100</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${ncv}%`,
              backgroundColor: ncv <= 20 ? "#22c55e" : ncv <= 50 ? "#eab308" : ncv <= 75 ? "#f97316" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Variable list */}
      <div className="space-y-2">
        {snapshot.variables.slice(0, 4).map((v) => (
          <VariableRow key={v.id} variable={v} />
        ))}
        {snapshot.variables.length > 4 && (
          <p className="text-sm text-slate-400 text-center">
            +{snapshot.variables.length - 4} more variables
          </p>
        )}
      </div>

      {/* Violation summary */}
      {violatingVars.length > 0 ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-orange-300">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{violatingVars.length} variable{violatingVars.length > 1 ? "s" : ""} outside safe bounds</span>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-sm text-green-300">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>All variables within safe bounds</span>
        </div>
      )}
    </div>
  );
}

function VariableRow({ variable: v }: { variable: DomainStateVariable }) {
  const isViolating = v.violation > 0;
  const pct = v.normalized_value;

  return (
    <div>
      <div className="flex justify-between text-sm mb-0.5">
        <span className={clsx("truncate max-w-[160px]", isViolating ? "text-orange-300" : "text-slate-300")}>
          {v.name}
        </span>
        <span className="text-slate-200 ml-2 whitespace-nowrap">
          {v.value.toFixed(1)} {v.unit}
        </span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: isViolating ? "#f97316" : "#22c55e",
          }}
        />
      </div>
    </div>
  );
}
