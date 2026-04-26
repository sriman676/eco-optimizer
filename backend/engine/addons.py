import copy
from collections import defaultdict
from statistics import pstdev

from engine.sensitivity import compute_sensitivity
from engine.stability import compute_stability


POLICY_MULTIPLIERS = {
    "conservative": {"budget": 0.85, "iterations": 0.70, "target": 1.10},
    "balanced": {"budget": 1.00, "iterations": 1.00, "target": 1.00},
    "aggressive": {"budget": 1.20, "iterations": 1.25, "target": 0.85},
}

SYSTEM_MODE_MULTIPLIERS = {
    "cost_efficient": {"budget": 0.85, "iterations": 0.80, "target": 1.10},
    "fast_recovery": {"budget": 1.15, "iterations": 1.20, "target": 0.90},
}


def prepare_addon_run(req, domain_defs: dict[str, dict]) -> tuple[dict[str, dict], dict]:
    """Return filtered domain definitions and deterministic runtime parameters."""
    policy = POLICY_MULTIPLIERS.get(req.policy_mode, POLICY_MULTIPLIERS["balanced"])
    system_mode = SYSTEM_MODE_MULTIPLIERS.get(req.system_mode, {"budget": 1.0, "iterations": 1.0, "target": 1.0})
    relaxation = 1.0 + req.constraint_relaxation_pct

    filtered_defs = copy.deepcopy(domain_defs)
    disallowed = set(req.disallowed_action_ids or [])
    for dom in filtered_defs.values():
        dom["actions"] = [a for a in dom.get("actions", []) if a["id"] not in disallowed]

    effective_budget = req.budget * policy["budget"] * system_mode["budget"] * relaxation
    effective_iterations = round(req.max_iterations * policy["iterations"] * system_mode["iterations"])
    effective_target = req.target_ncv * policy["target"] * system_mode["target"]

    runtime = {
        "weather_city": req.weather_city,
        "requested_budget": req.budget,
        "effective_budget": round(max(1.0, effective_budget), 2),
        "requested_max_iterations": req.max_iterations,
        "effective_max_iterations": max(1, min(200, effective_iterations)),
        "requested_target_ncv": req.target_ncv,
        "effective_target_ncv": round(max(0.0, effective_target), 4),
        "policy_mode": req.policy_mode,
        "system_mode": req.system_mode,
        "constraint_relaxation_pct": req.constraint_relaxation_pct,
        "preview_only": req.preview_only,
        "disallowed_action_ids": sorted(disallowed),
    }
    return filtered_defs, runtime


def enrich_optimization_result(
    result: dict,
    domain_defs: dict[str, dict],
    initial_values: dict[str, dict[str, float]],
    runtime: dict,
    latest_weather: dict | None,
) -> dict:
    selected_defs = [domain_defs[did] for did in result["domains_optimized"] if did in domain_defs]

    result["run_config"] = runtime
    result["top_factor"] = _top_factor(result.get("initial_state", []))
    result["domain_impact_breakdown"] = _domain_impact(result.get("initial_state", []), result.get("final_state", []))
    result["trend_projection"] = _trend_projection(result)
    result["sensitivity_analysis"] = compute_sensitivity(selected_defs, initial_values)
    result["stability_score"] = compute_stability(selected_defs, _final_values_from_snapshots(result.get("final_state", [])))
    result["decision_confidence"] = _decision_confidence(result, latest_weather)
    result["constraint_relaxation"] = _constraint_relaxation(result, runtime)
    result["rejected_actions"] = _rejected_actions(result, selected_defs, runtime)

    action_meta = _action_meta(selected_defs)
    for idx, action in enumerate(result.get("actions_taken", [])):
        meta = action_meta.get(action["action_id"], {})
        uncertainty = _uncertainty(result, latest_weather)
        action["tradeoffs"] = _tradeoffs(action)
        action["feasibility"] = _feasibility(meta, action)
        action["priority"] = _priority(action, result)
        action["risk_level"] = _risk_level(action, uncertainty)
        action["confidence"] = _action_confidence(action, result, latest_weather)
        action["approved"] = action["action_id"] not in runtime.get("disallowed_action_ids", [])
        action["replay_step"] = idx + 1

    return result


def _top_factor(initial_state: list[dict]) -> dict | None:
    factors = []
    for dom in initial_state:
        for var in dom.get("variables", []):
            factors.append({
                "domain_id": dom["domain_id"],
                "domain_name": dom["domain_name"],
                "variable_id": var["id"],
                "variable_name": var["name"],
                "weighted_violation": round(var.get("weighted_violation", 0.0), 4),
                "violation": round(var.get("violation", 0.0), 4),
            })
    return max(factors, key=lambda x: x["weighted_violation"], default=None)


def _domain_impact(initial_state: list[dict], final_state: list[dict]) -> list[dict]:
    final_by_id = {d["domain_id"]: d for d in final_state}
    rows = []
    for init in initial_state:
        final = final_by_id.get(init["domain_id"], {})
        before = init.get("domain_ncv", 0.0)
        after = final.get("domain_ncv", before)
        delta = before - after
        rows.append({
            "domain_id": init["domain_id"],
            "domain_name": init["domain_name"],
            "initial_ncv": round(before, 4),
            "final_ncv": round(after, 4),
            "improvement": round(delta, 4),
            "improvement_pct": round((delta / before * 100.0) if before > 0 else 0.0, 2),
        })
    return sorted(rows, key=lambda x: x["improvement"], reverse=True)


def _trend_projection(result: dict) -> list[dict]:
    base = result.get("initial_ncv", 0.0)
    final = result.get("final_ncv", base)
    unresolved = max(final, 0.0)
    drift = max(0.4, unresolved * 0.035)
    return [
        {"period": "Now", "projected_ncv": round(base, 2), "note": "Current measured risk"},
        {"period": "+30 days no action", "projected_ncv": round(min(100.0, base + drift), 2), "note": "Risk compounds without corrective action"},
        {"period": "+90 days no action", "projected_ncv": round(min(100.0, base + drift * 3), 2), "note": "Constraints become harder to recover"},
    ]


def _final_values_from_snapshots(snapshots: list[dict]) -> dict[str, dict[str, float]]:
    return {
        snap["domain_id"]: {v["id"]: v["value"] for v in snap.get("variables", [])}
        for snap in snapshots
    }


def _decision_confidence(result: dict, latest_weather: dict | None) -> dict:
    data_reliability = 0.72 if latest_weather and latest_weather.get("is_simulated") else 0.90
    history = result.get("ncv_history", [])
    if len(history) <= 2:
        model_stability = 0.78
    else:
        reductions = [max(0.0, history[i - 1] - history[i]) for i in range(1, len(history))]
        mean = sum(reductions) / len(reductions) if reductions else 0.0
        variation = pstdev(reductions) / mean if mean > 0 else 0.0
        model_stability = max(0.55, min(0.98, 1.0 - variation * 0.25))
    overall = (data_reliability * 0.45) + (model_stability * 0.40) + (result.get("total_improvement_score", 0) * 0.15)
    return {
        "data_reliability": round(data_reliability * 100, 1),
        "model_stability": round(model_stability * 100, 1),
        "overall": round(overall * 100, 1),
    }


def _constraint_relaxation(result: dict, runtime: dict) -> dict:
    constrained = result.get("status") == "PARTIAL" or result.get("stopped_reason") in {"budget_exhausted", "no_beneficial_action"}
    if not constrained:
        return {"needed": False, "suggestion": "Current constraints were sufficient.", "enabled": runtime["constraint_relaxation_pct"] > 0}
    requested = runtime["requested_budget"]
    return {
        "needed": True,
        "enabled": runtime["constraint_relaxation_pct"] > 0,
        "suggestion": f"Relax budget by 15-25% or allow more iterations. Current budget: ${requested:,.0f}.",
    }


def _rejected_actions(result: dict, selected_defs: list[dict], runtime: dict) -> list[dict]:
    selected_ids = {a["action_id"] for a in result.get("actions_taken", [])}
    disallowed = set(runtime.get("disallowed_action_ids", []))
    budget_remaining = result.get("budget_remaining", 0.0)
    rows = []
    for dom in selected_defs:
        for action in dom.get("actions", []):
            if action["id"] in selected_ids:
                continue
            if action["id"] in disallowed:
                reason = "Rejected by human approval filter."
            elif action["cost"] > budget_remaining:
                reason = "Not selected because remaining budget is insufficient."
            else:
                reason = "Not selected because another action had better NCV reduction per cost."
            rows.append({
                "action_id": action["id"],
                "action_name": action["name"],
                "domain_id": dom["id"],
                "domain_name": dom["name"],
                "cost": action["cost"],
                "reason": reason,
            })
    return rows


def _action_meta(selected_defs: list[dict]) -> dict[str, dict]:
    return {a["id"]: a for dom in selected_defs for a in dom.get("actions", [])}


def _tradeoffs(action: dict) -> list[dict]:
    rows = []
    for eff in action.get("effects_applied", []):
        direction = "+" if eff["delta_applied"] >= 0 else "-"
        rows.append({
            "variable_name": eff["variable_name"],
            "indicator": direction,
            "delta": eff["delta_applied"],
            "impact": "positive" if action.get("ncv_reduction", 0) > 0 else "neutral",
        })
    return rows


def _feasibility(meta: dict, action: dict) -> str:
    cost = action.get("actual_cost", meta.get("cost", 0))
    max_apps = meta.get("max_applications", 1)
    if cost <= 5000 and max_apps >= 2:
        return "Feasible"
    if cost <= 12000:
        return "Limited"
    return "Not Feasible"


def _priority(action: dict, result: dict) -> str:
    total = max(result.get("ncv_reduction", 0.0), 0.0001)
    share = action.get("ncv_reduction", 0.0) / total
    if share >= 0.25 or action.get("ncv_before", 0.0) >= 50:
        return "Critical"
    if share >= 0.10:
        return "Recommended"
    return "Optional"


def _uncertainty(result: dict, latest_weather: dict | None) -> float:
    weather_penalty = 0.18 if latest_weather and latest_weather.get("is_simulated") else 0.06
    partial_penalty = 0.10 if result.get("status") == "PARTIAL" else 0.0
    return min(0.5, weather_penalty + partial_penalty)


def _risk_level(action: dict, uncertainty: float) -> str:
    magnitude = abs(action.get("ncv_reduction", 0.0))
    score = magnitude * (1.0 + uncertainty)
    if score >= 12:
        return "HIGH"
    if score >= 5:
        return "MEDIUM"
    return "LOW"


def _action_confidence(action: dict, result: dict, latest_weather: dict | None) -> float:
    reliability = 0.72 if latest_weather and latest_weather.get("is_simulated") else 0.90
    consistency = 0.85 if action.get("application_number", 1) == 1 else 0.74
    impact = min(1.0, max(0.0, action.get("ncv_reduction", 0.0) / max(result.get("initial_ncv", 1.0), 1.0)))
    return round((reliability * 0.45 + consistency * 0.35 + impact * 0.20) * 100.0, 1)
