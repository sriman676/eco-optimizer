// ── Domain types ──────────────────────────────────────────────

export interface WeatherModifier {
  variable_id: string;
  weather_param: string;
  coefficient: number;
  baseline: number;
}

export interface VariableEffect {
  variable_id: string;
  delta: number;
}

export interface DomainVariable {
  id: string;
  name: string;
  unit: string;
  value: number;
  min_value: number;
  max_value: number;
  min_safe: number;
  max_safe: number;
  weight: number;
  higher_is_better: boolean;
  weather_sensitive: boolean;
}

export interface DomainAction {
  id: string;
  name: string;
  description: string;
  cost: number;
  effects: VariableEffect[];
  max_applications: number;
  diminishing_factor: number;
}

export interface Domain {
  id: string;
  name: string;
  sdg: number[];
  description: string;
  icon: string;
  variables: DomainVariable[];
  actions: DomainAction[];
  weather_modifiers?: WeatherModifier[];
}

// ── State / NCV snapshot types ────────────────────────────────

export interface DomainStateVariable {
  id: string;
  name: string;
  unit: string;
  value: number;
  normalized_value: number;
  violation: number;
  weighted_violation: number;
  weight: number;
  min_safe: number;
  max_safe: number;
  min_value: number;
  max_value: number;
  higher_is_better: boolean;
}

export interface DomainStateSnapshot {
  domain_id: string;
  domain_name: string;
  domain_icon: string;
  sdg: number[];
  variables: DomainStateVariable[];
  domain_ncv: number;
}

export interface GlobalStateResponse {
  domains: DomainStateSnapshot[];
  global_ncv: number;
  total_variables: number;
  variables_in_violation: number;
}

// ── Weather ───────────────────────────────────────────────────

export interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  wind_speed: number;
  conditions: string;
  is_simulated: boolean;
  cached: boolean;
  timestamp: string;
}

// ── Optimization ──────────────────────────────────────────────

export interface OptimizationRequest {
  domain_ids: string[];
  budget: number;
  max_iterations: number;
  target_ncv: number;
  weather_city?: string;
  policy_mode?: "conservative" | "balanced" | "aggressive";
  system_mode?: "cost_efficient" | "fast_recovery";
  disallowed_action_ids?: string[];
  preview_only?: boolean;
  constraint_relaxation_pct?: number;
}

export interface EffectApplied {
  variable_id: string;
  variable_name: string;
  delta_applied: number;
  value_before: number;
  value_after: number;
}

export interface ActionRecord {
  action_id: string;
  action_name: string;
  domain_id: string;
  domain_name: string;
  application_number: number;
  actual_cost: number;
  ncv_before: number;
  ncv_after: number;
  ncv_reduction: number;
  effects_applied: EffectApplied[];
  // explainability
  reason: string;
  score: number;
  affected_domains: string[];
  tradeoffs?: ActionTradeoff[];
  feasibility?: "Feasible" | "Limited" | "Not Feasible";
  priority?: "Critical" | "Recommended" | "Optional";
  risk_level?: "LOW" | "MEDIUM" | "HIGH";
  confidence?: number;
  approved?: boolean;
  replay_step?: number;
}

export interface ActionTradeoff {
  variable_name: string;
  indicator: "+" | "-";
  delta: number;
  impact: string;
}

export interface VariableChange {
  domain_id: string;
  domain_name: string;
  variable_id: string;
  variable_name: string;
  unit: string;
  initial_value: number;
  final_value: number;
  change: number;
  initial_normalized: number;
  final_normalized: number;
  initial_violation: number;
  final_violation: number;
}

export interface OptimizationResult {
  id: string;
  timestamp: string;
  domains_optimized: string[];
  budget_total: number;
  budget_used: number;
  budget_remaining: number;
  initial_ncv: number;
  final_ncv: number;
  ncv_reduction: number;
  ncv_reduction_pct: number;
  cost_efficiency: number;
  total_improvement_score: number;
  total_iterations: number;
  stopped_reason: string;
  status: "COMPLETE" | "PARTIAL";
  partial_message?: string | null;
  actions_taken: ActionRecord[];
  variable_changes: VariableChange[];
  ncv_history: number[];
  initial_state: DomainStateSnapshot[];
  final_state: DomainStateSnapshot[];
  explanation: string;
  // AI layer
  ai_action_explanations?: Record<string, string> | null;
  ai_report_summary?: string | null;
  ai_insights?: string[] | null;
  ai_suggestions?: string[] | null;
  run_config?: RunConfig;
  top_factor?: TopFactor | null;
  domain_impact_breakdown?: DomainImpact[];
  trend_projection?: TrendProjection[];
  sensitivity_analysis?: SensitivityRow[];
  stability_score?: number;
  decision_confidence?: DecisionConfidence;
  constraint_relaxation?: ConstraintRelaxation;
  rejected_actions?: RejectedAction[];
}

export interface RunConfig {
  weather_city?: string;
  requested_budget: number;
  effective_budget: number;
  requested_max_iterations: number;
  effective_max_iterations: number;
  requested_target_ncv: number;
  effective_target_ncv: number;
  policy_mode: string;
  system_mode: string;
  constraint_relaxation_pct: number;
  preview_only: boolean;
  disallowed_action_ids: string[];
}

export interface TopFactor {
  domain_id: string;
  domain_name: string;
  variable_id: string;
  variable_name: string;
  weighted_violation: number;
  violation: number;
}

export interface DomainImpact {
  domain_id: string;
  domain_name: string;
  initial_ncv: number;
  final_ncv: number;
  improvement: number;
  improvement_pct: number;
}

export interface TrendProjection {
  period: string;
  projected_ncv: number;
  note: string;
}

export interface SensitivityRow {
  domain_id: string;
  domain_name: string;
  variable_id: string;
  variable_name: string;
  unit: string;
  current_value: number;
  perturbed_value: number;
  delta_ncv: number;
  sensitivity_score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
}

export interface DecisionConfidence {
  data_reliability: number;
  model_stability: number;
  overall: number;
}

export interface ConstraintRelaxation {
  needed: boolean;
  enabled: boolean;
  suggestion: string;
}

export interface RejectedAction {
  action_id: string;
  action_name: string;
  domain_id: string;
  domain_name: string;
  cost: number;
  reason: string;
}

// ── Reports ───────────────────────────────────────────────────

export interface ReportSummary {
  id: string;
  timestamp: string;
  domains_optimized: string[];
  initial_ncv: number;
  final_ncv: number;
  ncv_reduction_pct: number;
  budget_used: number;
  total_iterations: number;
  stopped_reason: string;
}

export interface FeedbackRecord {
  timestamp: string;
  event_type: string;
  domain_id: string | null;
  ncv_snapshot: number;
  note: string;
}
