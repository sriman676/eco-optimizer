"""
Stability Score — Feature 17

Stability = weighted mean of (1 - violation) across all active variables.
Score is on 0–100 scale; 100 = everything in safe zone.
"""
from engine.ncv import _calculate_violation


def compute_stability(
    domain_definitions: list[dict],
    variable_values: dict[str, dict[str, float]],
) -> float:
    weighted_safe = 0.0
    weight_total = 0.0

    for dom in domain_definitions:
        did = dom["id"]
        for var in dom["variables"]:
            vid = var["id"]
            val = variable_values.get(did, {}).get(vid, var["value"])
            violation = _calculate_violation(
                val, var["min_value"], var["max_value"],
                var["min_safe"], var["max_safe"]
            )
            w = var["weight"]
            weighted_safe += (1.0 - violation) * w
            weight_total += w

    if weight_total == 0:
        return 100.0
    return round((weighted_safe / weight_total) * 100.0, 2)
