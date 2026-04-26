"""
Sensitivity Analysis — Feature 16

For each variable: perturb toward its unsafe direction by 10% of its range,
measure the NCV change, and rank HIGH / MEDIUM / LOW.
"""
import copy
from engine.ncv import calculate_global_ncv, _calculate_violation
from engine.normalizer import clamp


def compute_sensitivity(
    domain_definitions: list[dict],
    variable_values: dict[str, dict[str, float]],
    perturbation_pct: float = 0.10,
) -> list[dict]:
    base_ncv, _ = calculate_global_ncv(domain_definitions, variable_values)
    results: list[dict] = []

    for dom in domain_definitions:
        did = dom["id"]
        for var in dom["variables"]:
            vid = var["id"]
            base_val = variable_values.get(did, {}).get(vid, var["value"])
            span = var["max_value"] - var["min_value"]
            perturbation = span * perturbation_pct

            # Perturb toward the violation direction
            if var["higher_is_better"]:
                perturbed = clamp(base_val - perturbation, var["min_value"], var["max_value"])
            else:
                perturbed = clamp(base_val + perturbation, var["min_value"], var["max_value"])

            if abs(perturbed - base_val) < 1e-9:
                continue  # already at bound, skip

            p_vals = copy.deepcopy(variable_values)
            p_vals[did][vid] = perturbed
            new_ncv, _ = calculate_global_ncv(domain_definitions, p_vals)
            delta = new_ncv - base_ncv
            sensitivity = abs(delta) / (abs(perturbed - base_val) + 1e-10)

            results.append({
                "domain_id": did,
                "domain_name": dom["name"],
                "variable_id": vid,
                "variable_name": var["name"],
                "unit": var["unit"],
                "current_value": round(base_val, 3),
                "perturbed_value": round(perturbed, 3),
                "delta_ncv": round(delta, 4),
                "sensitivity_score": round(sensitivity, 4),
                "level": "",
            })

    if not results:
        return results

    scores = [r["sensitivity_score"] for r in results]
    lo, hi = min(scores), max(scores)
    span = hi - lo or 1.0

    for r in results:
        pct = (r["sensitivity_score"] - lo) / span
        r["level"] = "HIGH" if pct > 0.66 else "MEDIUM" if pct > 0.33 else "LOW"

    return sorted(results, key=lambda x: x["sensitivity_score"], reverse=True)
