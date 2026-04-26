import axios from "axios";
import type {
  Domain,
  GlobalStateResponse,
  WeatherData,
  OptimizationRequest,
  OptimizationResult,
  ReportSummary,
  FeedbackRecord,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8010";

const client = axios.create({ baseURL: BASE, timeout: 30000 });

export const api = {
  // ── Domains ───────────────────────────────────────────────
  getDomains: (): Promise<Domain[]> =>
    client.get("/api/domains/").then((r) => r.data),

  getDomainState: (): Promise<GlobalStateResponse> =>
    client.get("/api/domains/state").then((r) => r.data),

  resetAllStates: (): Promise<void> =>
    client.post("/api/domains/reset").then(() => undefined),

  loadCustomDomain: (payload: object): Promise<{ status: string; domain_id: string }> =>
    client.post("/api/domains/load", payload).then((r) => r.data),

  // ── Weather ───────────────────────────────────────────────
  getWeather: (city: string): Promise<WeatherData> =>
    client.get("/api/weather/", { params: { city } }).then((r) => r.data),

  // ── Optimization ─────────────────────────────────────────
  runOptimization: (req: OptimizationRequest): Promise<OptimizationResult> =>
    client.post("/api/optimize/", req).then((r) => r.data),

  // ── Reports ───────────────────────────────────────────────
  getReports: (): Promise<ReportSummary[]> =>
    client.get("/api/reports/").then((r) => r.data),

  getLatestReport: (): Promise<OptimizationResult> =>
    client.get("/api/reports/latest").then((r) => r.data),

  getReport: (id: string): Promise<OptimizationResult> =>
    client.get(`/api/reports/${id}`).then((r) => r.data),

  getFeedback: (): Promise<FeedbackRecord[]> =>
    client.get("/api/reports/feedback").then((r) => r.data),
};
