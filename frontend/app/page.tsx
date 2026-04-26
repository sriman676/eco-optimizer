"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import DomainCard from "@/components/DomainCard";
import WeatherWidget from "@/components/WeatherWidget";
import NCVGauge from "@/components/NCVGauge";
import OptimizerPanel from "@/components/OptimizerPanel";
import OptimizationResult from "@/components/OptimizationResult";
import ReportView from "@/components/ReportView";
import { Leaf, LayoutDashboard, Sliders, FileText, RefreshCw, AlertCircle, BrainCircuit, Wand2 } from "lucide-react";
import clsx from "clsx";

/** Returns a Tailwind background class based on NCV score (0–100) */
function ncvBarClass(ncv: number): string {
  if (ncv <= 20) return "bg-green-500";
  if (ncv <= 50) return "bg-yellow-500";
  if (ncv <= 75) return "bg-orange-500";
  return "bg-red-500";
}

export default function HomePage() {
  const {
    globalState,
    domains,
    loadDomains,
    loadGlobalState,
    fetchWeather,
    weatherCity,
    activeTab,
    setActiveTab,
    isLoadingState,
    error,
    optimizationResult,
    loadFeedback,
    runAutoFix,
    isOptimizing,
  } = useStore();

  useEffect(() => {
    loadDomains();
    loadGlobalState();
    fetchWeather(weatherCity);
    loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherCity]);

  const ncv = globalState?.global_ncv ?? 0;
  const snapshots = globalState?.domains ?? [];

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">EcoOptimizer</h1>
              <p className="text-sm text-slate-300">Simple Sustainability Planner</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex gap-1">
            {(["dashboard", "optimize", "reports"] as const).map((tab) => {
              const labels = { dashboard: "Dashboard", optimize: "Plan", reports: "Reports" };
              const icons = {
                dashboard: <LayoutDashboard className="w-3.5 h-3.5" />,
                optimize: <Sliders className="w-3.5 h-3.5" />,
                reports: <FileText className="w-3.5 h-3.5" />,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                    activeTab === tab
                      ? "bg-brand-700 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {icons[tab]}
                  {labels[tab]}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab("optimize"); runAutoFix(); }}
              disabled={isOptimizing}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                isOptimizing
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-700 to-brand-600 hover:from-purple-600 hover:to-brand-500 text-white"
              )}
              title="Auto-fix all domains"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Auto-Fix
            </button>
            <button
              onClick={loadGlobalState}
              disabled={isLoadingState}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh state"
            >
              <RefreshCw className={clsx("w-4 h-4", isLoadingState && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* System identity banner — always visible */}
        <div className="mb-6 flex items-center gap-2 bg-slate-900 border border-brand-700/50 rounded-lg px-4 py-3">
          <BrainCircuit className="w-4 h-4 text-brand-400 shrink-0" />
          <p className="text-sm text-slate-200 font-medium">
            This tool recommends practical actions using your current data.
          </p>
        </div>

        {/* Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Top row: NCV gauge + weather */}
            <div className="flex flex-wrap gap-6 items-start">
              <div className="readable-panel rounded-2xl p-6 flex flex-col items-center gap-2">
                <p className="text-sm text-slate-300 font-semibold tracking-wide uppercase">
                  Overall Risk Score
                </p>
                <div className="relative">
                  <NCVGauge value={ncv} size={160} label="Risk Score" />
                </div>
                <div className="text-center mt-2">
                  <p className="text-sm text-slate-300">
                    {globalState?.variables_in_violation ?? 0} / {globalState?.total_variables ?? 0}{" "}
                    items outside safe range
                  </p>
                </div>
              </div>

              <div className="flex-1 min-w-[280px]">
                <WeatherWidget />
                <div className="mt-4 readable-panel p-4">
                  <p className="text-sm text-slate-300 uppercase tracking-wide mb-3 font-semibold">Domain Risk Overview</p>
                  <div className="space-y-2">
                    {snapshots.map((s) => (
                      <div key={s.domain_id} className="flex items-center gap-3">
                        <span className="text-base w-6 shrink-0">{s.domain_icon}</span>
                        <span className="text-sm text-slate-200 flex-1 truncate">{s.domain_name}</span>
                        <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${ncvBarClass(s.domain_ncv)}`}
                            style={{ width: `${s.domain_ncv}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-200 w-8 text-right">{s.domain_ncv.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Domain cards grid */}
            <div>
              <h2 className="text-base font-semibold text-white mb-4">Domain Health</h2>
              {isLoadingState ? (
                <div className="text-center py-12 text-slate-500 text-sm">Loading domain state…</div>
              ) : snapshots.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">No domains loaded</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {snapshots.map((snap) => (
                    <DomainCard key={snap.domain_id} snapshot={snap} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Optimizer */}
        {activeTab === "optimize" && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-white">Create Action Plan</h2>
            <OptimizerPanel />
            {optimizationResult && <OptimizationResult result={optimizationResult} />}
          </div>
        )}

        {/* Reports */}
        {activeTab === "reports" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Plan Reports</h2>
            <ReportView />
          </div>
        )}
      </main>
    </div>
  );
}
