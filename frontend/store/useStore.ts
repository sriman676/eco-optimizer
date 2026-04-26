"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  Domain,
  GlobalStateResponse,
  WeatherData,
  OptimizationResult,
  ReportSummary,
  FeedbackRecord,
  OptimizationRequest,
} from "@/types";

interface AppStore {
  // ── Domain catalog ────────────────────────────────────────
  domains: Domain[];
  selectedDomainIds: string[];

  // ── Live state ────────────────────────────────────────────
  globalState: GlobalStateResponse | null;

  // ── Weather ───────────────────────────────────────────────
  weather: WeatherData | null;
  weatherCity: string;

  // ── Optimization ─────────────────────────────────────────
  isOptimizing: boolean;
  optimizationResult: OptimizationResult | null;
  budget: number;
  maxIterations: number;
  targetNCV: number;
  policyMode: "conservative" | "balanced" | "aggressive";
  systemMode: "cost_efficient" | "fast_recovery";
  relaxationEnabled: boolean;
  optimizationError: string | null;
  previewResult: OptimizationResult | null;
  approvedActionIds: string[];

  // ── Animation (Auto-Fix playback) ────────────────────────
  isAnimating: boolean;
  animationStep: number;
  animationHistory: number[];

  // ── Reports ───────────────────────────────────────────────
  reports: ReportSummary[];
  selectedReport: OptimizationResult | null;
  feedback: FeedbackRecord[];

  // ── UI state ─────────────────────────────────────────────
  activeTab: "dashboard" | "optimize" | "reports";
  isLoadingState: boolean;
  error: string | null;

  // ── Actions ───────────────────────────────────────────────
  loadDomains: () => Promise<void>;
  loadGlobalState: () => Promise<void>;
  toggleDomain: (id: string) => void;
  selectAllDomains: () => void;
  clearDomainSelection: () => void;
  fetchWeather: (city: string) => Promise<void>;
  runOptimization: (options?: { previewOnly?: boolean; disallowedActionIds?: string[] }) => Promise<void>;
  approvePreviewActions: (actionIds: string[]) => Promise<void>;
  runAutoFix: () => Promise<void>;
  resetState: () => Promise<void>;
  loadReports: () => Promise<void>;
  loadReport: (id: string) => Promise<void>;
  loadFeedback: () => Promise<void>;
  setBudget: (v: number) => void;
  setMaxIterations: (v: number) => void;
  setTargetNCV: (v: number) => void;
  setPolicyMode: (v: "conservative" | "balanced" | "aggressive") => void;
  setSystemMode: (v: "cost_efficient" | "fast_recovery") => void;
  setRelaxationEnabled: (v: boolean) => void;
  setApprovedActionIds: (ids: string[]) => void;
  setActiveTab: (t: "dashboard" | "optimize" | "reports") => void;
  clearOptimizationResult: () => void;
  // animation controls
  startAnimation: (history: number[]) => void;
  advanceAnimation: () => void;
  stopAnimation: () => void;
}

export const useStore = create<AppStore>((set, get) => ({
  domains: [],
  selectedDomainIds: [],
  globalState: null,
  weather: null,
  weatherCity: "London",
  isOptimizing: false,
  optimizationResult: null,
  budget: 50000,
  maxIterations: 100,
  targetNCV: 0,
  policyMode: "balanced",
  systemMode: "cost_efficient",
  relaxationEnabled: false,
  optimizationError: null,
  previewResult: null,
  approvedActionIds: [],
  isAnimating: false,
  animationStep: 0,
  animationHistory: [],
  reports: [],
  selectedReport: null,
  feedback: [],
  activeTab: "dashboard",
  isLoadingState: false,
  error: null,

  loadDomains: async () => {
    try {
      const domains = await api.getDomains();
      set({ domains, error: null });
    } catch {
      set({ error: "Failed to load domains" });
    }
  },

  loadGlobalState: async () => {
    set({ isLoadingState: true });
    try {
      const globalState = await api.getDomainState();
      set({ globalState, isLoadingState: false, error: null });
    } catch {
      set({ isLoadingState: false, error: "Failed to load global state" });
    }
  },

  toggleDomain: (id) => {
    const { selectedDomainIds } = get();
    if (selectedDomainIds.includes(id)) {
      set({ selectedDomainIds: selectedDomainIds.filter((d) => d !== id) });
    } else {
      set({ selectedDomainIds: [...selectedDomainIds, id] });
    }
  },

  selectAllDomains: () => {
    const ids = get().domains.map((d) => d.id);
    set({ selectedDomainIds: ids });
  },

  clearDomainSelection: () => set({ selectedDomainIds: [] }),

  fetchWeather: async (city) => {
    set({ weatherCity: city });
    try {
      const weather = await api.getWeather(city);
      set({ weather, error: null });
    } catch {
      set({ error: "Failed to fetch weather" });
    }
  },

  runOptimization: async (options = {}) => {
    const { selectedDomainIds, budget, maxIterations, targetNCV, policyMode, systemMode, relaxationEnabled, weatherCity } = get();
    if (selectedDomainIds.length === 0) {
      set({ optimizationError: "Select at least one domain" });
      return;
    }
    set({ isOptimizing: true, optimizationError: null, optimizationResult: options.previewOnly ? get().optimizationResult : null });
    try {
      const req: OptimizationRequest = {
        domain_ids: selectedDomainIds,
        budget,
        max_iterations: maxIterations,
        target_ncv: targetNCV,
        weather_city: weatherCity,
        policy_mode: policyMode,
        system_mode: systemMode,
        constraint_relaxation_pct: relaxationEnabled ? 0.2 : 0,
        preview_only: options.previewOnly ?? false,
        disallowed_action_ids: options.disallowedActionIds ?? [],
      };
      const result = await api.runOptimization(req);
      if (options.previewOnly) {
        set({
          previewResult: result,
          approvedActionIds: result.actions_taken.map((a) => a.action_id),
          isOptimizing: false,
        });
      } else {
        set({ optimizationResult: result, previewResult: null, approvedActionIds: [], isOptimizing: false });
        get().startAnimation(result.ncv_history);
        await get().loadGlobalState();
        await get().loadReports();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Optimization failed";
      set({ isOptimizing: false, optimizationError: msg });
    }
  },

  approvePreviewActions: async (actionIds) => {
    const preview = get().previewResult;
    if (!preview) {
      set({ optimizationError: "Run a preview before approving actions" });
      return;
    }
    const proposed = new Set(preview.actions_taken.map((a) => a.action_id));
    const approved = new Set(actionIds);
    const disallowed = Array.from(proposed).filter((id) => !approved.has(id));
    await get().runOptimization({ previewOnly: false, disallowedActionIds: disallowed });
  },

  runAutoFix: async () => {
    const { domains, policyMode, systemMode, relaxationEnabled, weatherCity } = get();
    if (domains.length === 0) {
      set({ optimizationError: "No domains loaded" });
      return;
    }
    // Auto-select all domains with high budget
    const allIds = domains.map((d) => d.id);
    set({
      selectedDomainIds: allIds,
      budget: 1000000,
      maxIterations: 200,
      targetNCV: 0,
      isOptimizing: true,
      optimizationError: null,
      optimizationResult: null,
      activeTab: "optimize",
    });
    try {
      const req: OptimizationRequest = {
        domain_ids: allIds,
        budget: 1000000,
        max_iterations: 200,
        target_ncv: 0,
        weather_city: weatherCity,
        policy_mode: policyMode,
        system_mode: systemMode,
        constraint_relaxation_pct: relaxationEnabled ? 0.2 : 0,
      };
      const result = await api.runOptimization(req);
      set({ optimizationResult: result, isOptimizing: false });
      get().startAnimation(result.ncv_history);
      await get().loadGlobalState();
      await get().loadReports();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Auto-Fix failed";
      set({ isOptimizing: false, optimizationError: msg });
    }
  },

  resetState: async () => {
    try {
      await api.resetAllStates();
      await get().loadGlobalState();
      set({ optimizationResult: null, error: null, isAnimating: false });
    } catch {
      set({ error: "Failed to reset state" });
    }
  },

  loadReports: async () => {
    try {
      const reports = await api.getReports();
      set({ reports, error: null });
    } catch {
      set({ error: "Failed to load reports" });
    }
  },

  loadReport: async (id) => {
    try {
      const report = await api.getReport(id);
      set({ selectedReport: report });
    } catch {
      set({ error: "Failed to load report" });
    }
  },

  loadFeedback: async () => {
    try {
      const feedback = await api.getFeedback();
      set({ feedback });
    } catch {
      // silent
    }
  },

  setBudget: (v) => set({ budget: v }),
  setMaxIterations: (v) => set({ maxIterations: v }),
  setTargetNCV: (v) => set({ targetNCV: v }),
  setPolicyMode: (v) => set({ policyMode: v }),
  setSystemMode: (v) => set({ systemMode: v }),
  setRelaxationEnabled: (v) => set({ relaxationEnabled: v }),
  setApprovedActionIds: (ids) => set({ approvedActionIds: ids }),
  setActiveTab: (t) => set({ activeTab: t }),
  clearOptimizationResult: () => set({ optimizationResult: null }),

  startAnimation: (history) => {
    if (history.length <= 1) return;
    set({ isAnimating: true, animationStep: 0, animationHistory: history });
  },

  advanceAnimation: () => {
    const { animationStep, animationHistory } = get();
    if (animationStep >= animationHistory.length - 1) {
      set({ isAnimating: false });
    } else {
      set({ animationStep: animationStep + 1 });
    }
  },

  stopAnimation: () => set({ isAnimating: false }),
}));
