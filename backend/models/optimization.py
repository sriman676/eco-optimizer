from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class OptimizationRequest(BaseModel):
    domain_ids: List[str]
    budget: float = Field(gt=0)
    max_iterations: int = Field(default=100, ge=1, le=200)
    target_ncv: float = Field(default=0.0, ge=0.0)
    weather_city: str = "London"
    # addon features
    policy_mode: str = "balanced"                 # conservative | balanced | aggressive
    system_mode: str = "cost_efficient"           # cost_efficient | fast_recovery
    disallowed_action_ids: List[str] = []         # HITL: skip these action IDs
    preview_only: bool = False                    # HITL: preview without executing
    constraint_relaxation_pct: float = Field(default=0.0, ge=0.0, le=0.5)


class EffectApplied(BaseModel):
    variable_id: str
    variable_name: str
    delta_applied: float
    value_before: float
    value_after: float


class ActionRecord(BaseModel):
    action_id: str
    action_name: str
    domain_id: str
    domain_name: str
    application_number: int
    actual_cost: float
    ncv_before: float
    ncv_after: float
    ncv_reduction: float
    effects_applied: List[EffectApplied]
    # ── explainability ──
    reason: str = ""                    # why this action was selected
    score: float = 0.0                  # (NCV_before - NCV_after) / cost
    affected_domains: List[str] = []    # which domains this action targets


class VariableChange(BaseModel):
    domain_id: str
    domain_name: str
    variable_id: str
    variable_name: str
    unit: str
    initial_value: float
    final_value: float
    change: float
    initial_normalized: float
    final_normalized: float
    initial_violation: float
    final_violation: float


class OptimizationResult(BaseModel):
    id: str
    timestamp: str
    domains_optimized: List[str]
    budget_total: float
    budget_used: float
    budget_remaining: float
    initial_ncv: float
    final_ncv: float
    ncv_reduction: float
    ncv_reduction_pct: float
    cost_efficiency: float          # NCV reduced per dollar spent
    total_improvement_score: float  # 0–1 composite improvement score
    total_iterations: int
    stopped_reason: str
    # ── partial failure ──
    status: str = "COMPLETE"        # "COMPLETE" | "PARTIAL"
    partial_message: Optional[str] = None
    actions_taken: List[ActionRecord]
    variable_changes: List[VariableChange]
    ncv_history: List[float]
    explanation: str
    # ── AI layer (explanation & reporting only) ──
    ai_action_explanations: Optional[dict] = None
    ai_report_summary: Optional[str] = None
    ai_insights: Optional[List[str]] = None
    ai_suggestions: Optional[List[str]] = None


class FeedbackRecord(BaseModel):
    timestamp: str
    event_type: str
    domain_id: Optional[str] = None
    ncv_snapshot: float
    note: str = ""
