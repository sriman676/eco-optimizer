"""
Greedy Priority-Weighted Optimizer

Algorithm:
  1. Compute initial NCV for selected domains.
  2. For each candidate action (across all selected domains):
       a. Respect max_applications constraint.
       b. Respect remaining budget constraint.
       c. Apply diminishing returns: effect = base_delta × (diminishing_factor ^ applications_so_far)
       d. Simulate the action on a copy of current state.
       e. Compute new NCV.
       f. Compute efficiency = Δncv / cost  (only if Δncv > 0)
  3. Select action with highest efficiency. Apply it for real.
  4. Record action in history; append NCV to ncv_history.
  5. Stop when:
       • NCV ≤ target_ncv
       • No action reduces NCV
       • Budget exhausted
       • max_iterations reached
"""

import copy
import uuid
from datetime import datetime, timezone

from engine.ncv import calculate_domain_ncv, calculate_global_ncv
from engine.normalizer import clamp


def _apply_effects_to_state(
    variable_values: dict[str, float],
    domain_def: dict,
    effects: list[dict],
) -> dict[str, float]:
    """Return a new variable_values dict with effects applied, respecting bounds."""
    result = copy.copy(variable_values)
    var_meta: dict[str, dict] = {v["id"]: v for v in domain_def["variables"]}
    for eff in effects:
        vid = eff["variable_id"]
        if vid not in result:
            continue
        meta = var_meta.get(vid)
        if meta is None:
            continue
        new_val = result[vid] + eff["delta"]
        result[vid] = clamp(new_val, meta["min_value"], meta["max_value"])
    return result


def run_greedy_optimization(
    domain_ids: list[str],
    domain_definitions: dict[str, dict],
    initial_variable_values: dict[str, dict[str, float]],
    budget: float,
    max_iterations: int,
    target_ncv: float,
) -> dict:
    # ── deep-copy so we never mutate the store during simulation ──
    current_values: dict[str, dict[str, float]] = copy.deepcopy(initial_variable_values)
    selected_defs = [domain_definitions[did] for did in domain_ids if did in domain_definitions]

    # pre-compute initial NCV snapshot
    initial_ncv, initial_snapshots = calculate_global_ncv(
        selected_defs, {did: current_values[did] for did in domain_ids if did in current_values}
    )

    remaining_budget = budget
    applications: dict[str, int] = {}       # action_id → times applied
    actions_taken: list[dict] = []
    ncv_history: list[float] = [initial_ncv]
    current_ncv = initial_ncv
    iteration = 0
    stopped_reason = "max_iterations"

    while iteration < max_iterations:
        best: dict | None = None
        best_efficiency = 0.0

        for dom_def in selected_defs:
            did = dom_def["id"]
            dom_values = current_values.get(did, {})

            for action in dom_def["actions"]:
                aid = action["id"]
                n_applied = applications.get(aid, 0)

                # ── constraint: max applications ──
                if n_applied >= action["max_applications"]:
                    continue

                # ── constraint: budget ──
                if action["cost"] > remaining_budget:
                    continue

                # ── diminishing returns ──
                factor = action["diminishing_factor"] ** n_applied
                scaled_effects = [
                    {"variable_id": e["variable_id"], "delta": e["delta"] * factor}
                    for e in action["effects"]
                ]

                # ── simulate ──
                sim_values = _apply_effects_to_state(dom_values, dom_def, scaled_effects)
                sim_all = {did: sim_values}
                for other_did in domain_ids:
                    if other_did != did:
                        sim_all[other_did] = current_values.get(other_did, {})

                sim_ncv, _ = calculate_global_ncv(
                    selected_defs,
                    {d: sim_all.get(d, {}) for d in domain_ids}
                )

                delta_ncv = current_ncv - sim_ncv

                if delta_ncv <= 0:
                    continue  # action doesn't improve NCV

                efficiency = delta_ncv / action["cost"]

                if efficiency > best_efficiency:
                    best_efficiency = efficiency
                    best = {
                        "dom_def": dom_def,
                        "did": did,
                        "action": action,
                        "scaled_effects": scaled_effects,
                        "sim_ncv": sim_ncv,
                        "delta_ncv": delta_ncv,
                        "factor": factor,
                        "efficiency": efficiency,      # stored for explainability
                    }

        if best is None:
            stopped_reason = "no_beneficial_action"
            break

        # ── apply best action for real ──
        did = best["did"]
        action = best["action"]
        dom_def = best["dom_def"]
        n_applied = applications.get(action["id"], 0)

        # record per-variable before/after
        effects_applied = []
        for eff in best["scaled_effects"]:
            vid = eff["variable_id"]
            vname = next((v["name"] for v in dom_def["variables"] if v["id"] == vid), vid)
            val_before = current_values[did].get(vid, 0.0)
            val_after = clamp(
                val_before + eff["delta"],
                next(v["min_value"] for v in dom_def["variables"] if v["id"] == vid),
                next(v["max_value"] for v in dom_def["variables"] if v["id"] == vid),
            )
            effects_applied.append({
                "variable_id": vid,
                "variable_name": vname,
                "delta_applied": round(eff["delta"], 4),
                "value_before": round(val_before, 4),
                "value_after": round(val_after, 4),
            })

        current_values[did] = _apply_effects_to_state(
            current_values[did], dom_def, best["scaled_effects"]
        )
        remaining_budget -= action["cost"]
        applications[action["id"]] = n_applied + 1
        ncv_before = current_ncv
        current_ncv = best["sim_ncv"]
        ncv_history.append(round(current_ncv, 4))

        actions_taken.append({
            "action_id": action["id"],
            "action_name": action["name"],
            "domain_id": did,
            "domain_name": dom_def["name"],
            "application_number": n_applied + 1,
            "actual_cost": action["cost"],
            "ncv_before": round(ncv_before, 4),
            "ncv_after": round(current_ncv, 4),
            "ncv_reduction": round(best["delta_ncv"], 4),
            "effects_applied": effects_applied,
            # ── explainability fields ──
            "score": round(best["efficiency"], 6),
            "affected_domains": [did],
            "reason": _generate_action_reason(
                action["name"], best["efficiency"], best["delta_ncv"],
                n_applied + 1, action["diminishing_factor"], n_applied,
                action["description"],
            ),
        })

        iteration += 1

        if current_ncv <= target_ncv:
            stopped_reason = "target_reached"
            break

        if remaining_budget <= 0:
            stopped_reason = "budget_exhausted"
            break

    # ── final state snapshot ──
    final_ncv, final_snapshots = calculate_global_ncv(
        selected_defs,
        {did: current_values[did] for did in domain_ids if did in current_values}
    )

    budget_used = budget - remaining_budget
    ncv_reduction = initial_ncv - final_ncv
    ncv_reduction_pct = (ncv_reduction / initial_ncv * 100.0) if initial_ncv > 0 else 0.0
    cost_efficiency = (ncv_reduction / budget_used) if budget_used > 0 else 0.0
    total_improvement_score = round(min(1.0, ncv_reduction_pct / 100.0), 4)

    # ── partial failure detection ──
    if final_ncv <= target_ncv or stopped_reason == "target_reached":
        status = "COMPLETE"
        partial_message = None
    elif final_ncv <= 0.5:
        status = "COMPLETE"
        partial_message = None
    else:
        status = "PARTIAL"
        partial_message = (
            f"Partial improvement achieved. "
            f"The system could not reach a fully safe state — "
            f"budget or action constraints are too restrictive. "
            f"Remaining NCV: {final_ncv:.1f}"
        )

    # ── variable change summary ──
    variable_changes = []
    for dom_def in selected_defs:
        did = dom_def["id"]
        init_vals = initial_variable_values.get(did, {})
        final_vals = current_values.get(did, {})
        init_snaps = {v["id"]: v for v in next(
            (s["variables"] for s in initial_snapshots if s["domain_id"] == did), []
        )}
        final_snaps = {v["id"]: v for v in next(
            (s["variables"] for s in final_snapshots if s["domain_id"] == did), []
        )}
        for var in dom_def["variables"]:
            vid = var["id"]
            iv = init_vals.get(vid, var["value"])
            fv = final_vals.get(vid, iv)
            variable_changes.append({
                "domain_id": did,
                "domain_name": dom_def["name"],
                "variable_id": vid,
                "variable_name": var["name"],
                "unit": var["unit"],
                "initial_value": round(iv, 4),
                "final_value": round(fv, 4),
                "change": round(fv - iv, 4),
                "initial_normalized": round(init_snaps.get(vid, {}).get("normalized_value", 0), 4),
                "final_normalized": round(final_snaps.get(vid, {}).get("normalized_value", 0), 4),
                "initial_violation": round(init_snaps.get(vid, {}).get("violation", 0), 4),
                "final_violation": round(final_snaps.get(vid, {}).get("violation", 0), 4),
            })

    # ── generate natural-language explanation ──
    explanation = _generate_explanation(
        actions_taken, initial_ncv, final_ncv, budget_used, stopped_reason
    )

    return {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "domains_optimized": domain_ids,
        "budget_total": budget,
        "budget_used": round(budget_used, 2),
        "budget_remaining": round(remaining_budget, 2),
        "initial_ncv": round(initial_ncv, 4),
        "final_ncv": round(final_ncv, 4),
        "ncv_reduction": round(ncv_reduction, 4),
        "ncv_reduction_pct": round(ncv_reduction_pct, 2),
        "cost_efficiency": round(cost_efficiency, 6),
        "total_improvement_score": total_improvement_score,
        "total_iterations": iteration,
        "stopped_reason": stopped_reason,
        "status": status,
        "partial_message": partial_message,
        "actions_taken": actions_taken,
        "variable_changes": variable_changes,
        "ncv_history": ncv_history,
        "initial_state": initial_snapshots,
        "final_state": final_snapshots,
        "explanation": explanation,
        # AI fields populated by api/optimize.py after the run
        "ai_action_explanations": None,
        "ai_report_summary": None,
        "ai_insights": None,
        "ai_suggestions": None,
    }


def _generate_action_reason(
    action_name: str,
    efficiency: float,
    delta_ncv: float,
    application_number: int,
    diminishing_factor: float,
    prev_applications: int,
    description: str,
) -> str:
    parts = [
        f"Selected because it provides the highest NCV reduction per cost "
        f"(score={efficiency:.4f})."
    ]
    if application_number > 1:
        retained_pct = round((diminishing_factor ** prev_applications) * 100)
        parts.append(
            f"Applied {application_number}× with {retained_pct}% retained effectiveness "
            f"due to diminishing returns."
        )
    parts.append(f"Reduces system violation by {delta_ncv:.2f} NCV points.")
    return " ".join(parts)


def _generate_explanation(
    actions: list[dict],
    initial_ncv: float,
    final_ncv: float,
    cost: float,
    reason: str,
) -> str:
    stop_map = {
        "target_reached": "the target NCV was reached",
        "no_beneficial_action": "no further action could reduce NCV within budget",
        "budget_exhausted": "the full budget was consumed",
        "max_iterations": "the maximum iteration limit was reached",
    }
    stop_desc = stop_map.get(reason, reason)

    if not actions:
        return "No actions were taken. The system is already within safe bounds or the budget was insufficient."

    top_actions = sorted(actions, key=lambda a: a["ncv_reduction"], reverse=True)[:3]
    top_names = ", ".join(f"'{a['action_name']}'" for a in top_actions)

    domain_costs: dict[str, float] = {}
    for a in actions:
        domain_costs[a["domain_name"]] = domain_costs.get(a["domain_name"], 0) + a["actual_cost"]
    top_domain = max(domain_costs, key=domain_costs.get)

    return (
        f"The optimizer applied {len(actions)} action(s) over {len(set(a['domain_id'] for a in actions))} domain(s), "
        f"reducing the global NCV from {initial_ncv:.1f} to {final_ncv:.1f} "
        f"(−{initial_ncv - final_ncv:.1f} points, {(initial_ncv - final_ncv) / initial_ncv * 100:.1f}% improvement). "
        f"The most impactful actions were {top_names}. "
        f"The highest budget allocation went to '{top_domain}'. "
        f"Optimization stopped because {stop_desc}. "
        f"Total investment: ${cost:,.0f}."
    )
