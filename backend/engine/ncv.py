"""
NCV – Normalized Constraint Violation

Formula  :  NCV = Σ(violation_i × weight_i) / Σ(weight_i)  ×  100
            result ∈ [0, 100]

violation_i  ∈ [0, 1]
  • variable below min_safe  → (min_safe_norm − norm_val) / min_safe_norm
  • variable above max_safe  → (norm_val − max_safe_norm) / (100 − max_safe_norm)
  • variable within safe zone → 0.0

weight_i = base_weight × severity_multiplier × region_modifier
  • severity_multiplier: 1.5 if violation > 0.5, else 1.0
  • region_modifier    : injected from weather context (default 1.0)
"""

from engine.normalizer import normalize


def _calculate_violation(
    value: float,
    min_val: float,
    max_val: float,
    min_safe: float,
    max_safe: float,
) -> float:
    norm = normalize(value, min_val, max_val)
    min_safe_norm = normalize(min_safe, min_val, max_val)
    max_safe_norm = normalize(max_safe, min_val, max_val)

    if norm < min_safe_norm:
        denom = min_safe_norm
        return (min_safe_norm - norm) / denom if denom > 0 else 1.0
    elif norm > max_safe_norm:
        denom = 100.0 - max_safe_norm
        return (norm - max_safe_norm) / denom if denom > 0 else 1.0
    return 0.0


def _dynamic_weight(base_weight: float, violation: float, region_modifier: float = 1.0) -> float:
    severity = 1.5 if violation > 0.5 else 1.0
    return base_weight * severity * region_modifier


def calculate_domain_ncv(
    domain_def: dict,
    variable_values: dict[str, float],
    region_modifiers: dict[str, float] | None = None,
) -> tuple[float, list[dict]]:
    """
    Returns (domain_ncv, per_variable_detail_list).
    domain_ncv is in [0, 100].
    """
    region_modifiers = region_modifiers or {}
    weighted_sum = 0.0
    weight_total = 0.0
    details: list[dict] = []

    for var in domain_def["variables"]:
        vid = var["id"]
        value = variable_values.get(vid, var["value"])
        violation = _calculate_violation(
            value, var["min_value"], var["max_value"],
            var["min_safe"], var["max_safe"]
        )
        region_mod = region_modifiers.get(vid, 1.0)
        eff_weight = _dynamic_weight(var["weight"], violation, region_mod)
        weighted_sum += violation * eff_weight
        weight_total += eff_weight

        details.append({
            "id": vid,
            "name": var["name"],
            "unit": var["unit"],
            "value": value,
            "normalized_value": normalize(value, var["min_value"], var["max_value"]),
            "violation": violation,
            "weighted_violation": violation * eff_weight,
            "weight": eff_weight,
            "base_weight": var["weight"],
            "min_safe": var["min_safe"],
            "max_safe": var["max_safe"],
            "min_value": var["min_value"],
            "max_value": var["max_value"],
            "higher_is_better": var["higher_is_better"],
        })

    ncv = (weighted_sum / weight_total * 100.0) if weight_total > 0 else 0.0
    return round(ncv, 4), details


def calculate_global_ncv(
    domain_definitions: list[dict],
    all_variable_values: dict[str, dict[str, float]],
    region_modifiers: dict[str, dict[str, float]] | None = None,
) -> tuple[float, list[dict]]:
    """
    Returns (global_ncv, per_domain_snapshot_list).
    """
    region_modifiers = region_modifiers or {}
    all_weighted = 0.0
    all_weights = 0.0
    snapshots: list[dict] = []

    for domain in domain_definitions:
        did = domain["id"]
        var_values = all_variable_values.get(did, {})
        dom_mods = region_modifiers.get(did, {})
        ncv, details = calculate_domain_ncv(domain, var_values, dom_mods)

        # aggregate
        for d in details:
            all_weighted += d["weighted_violation"]
            all_weights += d["weight"]

        snapshots.append({
            "domain_id": did,
            "domain_name": domain["name"],
            "domain_icon": domain.get("icon", "🌍"),
            "sdg": domain["sdg"],
            "variables": details,
            "domain_ncv": ncv,
        })

    global_ncv = (all_weighted / all_weights * 100.0) if all_weights > 0 else 0.0
    return round(global_ncv, 4), snapshots
