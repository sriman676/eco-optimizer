"use client";

import { useStore } from "@/store/useStore";
import { useEffect } from "react";
import { formatDistanceToNow } from "./timeUtils";
import { FileText, ChevronRight, TrendingDown, BrainCircuit, AlertTriangle, CheckCircle } from "lucide-react";
import OptimizationResultComp from "./OptimizationResult";
import NCVChart from "./NCVChart";
import clsx from "clsx";

export default function ReportView() {
  const { reports, selectedReport, loadReports, loadReport, feedback } = useStore();

  useEffect(() => {
    loadReports();
  }, []);

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No optimization reports yet.</p>
        <p className="text-sm mt-1">Run the optimizer to generate reports.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Report list */}
      <div className="lg:col-span-1 space-y-2">
        <h3 className="text-sm font-semibold text-white mb-3">Optimization History</h3>
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => loadReport(r.id)}
            className={clsx(
              "w-full text-left bg-slate-800 border rounded-xl p-4 transition-all hover:border-brand-500/50",
              selectedReport?.id === r.id ? "border-brand-500" : "border-slate-700"
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400">{formatDistanceToNow(r.timestamp)}</p>
                <p className="text-sm font-medium text-white mt-0.5">
                  {r.domains_optimized.length} domain{r.domains_optimized.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.domains_optimized.join(", ")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {(r as any).status === "PARTIAL" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                )}
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              <span className="text-xs text-green-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                {r.ncv_reduction_pct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">${r.budget_used.toLocaleString()}</span>
              <span className="text-xs text-yellow-400">
                Eff: {(r as any).cost_efficiency ? ((r as any).cost_efficiency * 1000).toFixed(3) : "—"}
              </span>
            </div>
          </button>
        ))}

        {/* Feedback NCV timeline */}
        {feedback.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-white mb-3">NCV Progression</h3>
            <NCVChart
              history={feedback.map((f) => f.ncv_snapshot)}
              height={160}
            />
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="lg:col-span-2">
        {selectedReport ? (
          <div>
            {/* Quick summary banner */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="w-4 h-4 text-brand-400" />
                <p className="text-sm font-semibold text-white">Report Summary</p>
              </div>
              {selectedReport.ai_report_summary ? (
                <p className="text-sm text-slate-200 leading-relaxed">
                  {selectedReport.ai_report_summary}
                </p>
              ) : (
                <p className="text-sm text-slate-200 leading-relaxed">
                  {selectedReport.explanation}
                </p>
              )}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-400">Total Improvement</p>
                  <p className="text-lg font-bold text-green-400">
                    {selectedReport.ncv_reduction_pct.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Cost Efficiency</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {(selectedReport.cost_efficiency * 1000).toFixed(3)}
                  </p>
                  <p className="text-xs text-slate-500">NCV / $1000</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Primary Domains</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {selectedReport.domains_optimized.slice(0, 2).join(", ")}
                  </p>
                </div>
              </div>
            </div>

            <OptimizationResultComp result={selectedReport} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
            Select a report from the list
          </div>
        )}
      </div>
    </div>
  );
}
