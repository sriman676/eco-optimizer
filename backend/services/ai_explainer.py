"""
AI Explanation & Reporting Layer

STRICT RULES:
  - Does NOT modify or influence the core optimization logic.
  - Does NOT make decisions. Only explains computed results.
  - All numbers in output are sourced directly from optimization data.
  - Called once AFTER the greedy optimizer completes.
"""

import json
import logging

from services.ai_providers import generate_json_response

logger = logging.getLogger(__name__)


def _compact_result(result: dict, weather: dict | None) -> dict:
    """Build minimal data payload for the AI prompt to keep token count low."""
    top_changes = sorted(
        result.get("variable_changes", []),
        key=lambda v: abs(v.get("change", 0)),
        reverse=True
    )[:5]

    return {
        "ncv_initial": result.get("initial_ncv"),
        "ncv_final": result.get("final_ncv"),
        "ncv_reduction_pct": result.get("ncv_reduction_pct"),
        "status": result.get("status", "PARTIAL"),
        "cost_efficiency": round(result.get("cost_efficiency", 0) * 1000, 3),
        "budget_used": result.get("budget_used"),
        "domains": result.get("domains_optimized", []),
        "actions": [
            {
                "id": a["action_id"],
                "name": a["action_name"],
                "domain": a["domain_name"],
                "ncv_reduction": round(a["ncv_reduction"], 2),
                "cost": a["actual_cost"],
                "application_number": a["application_number"],
                "score": round(a.get("score", 0), 5),
            }
            for a in result.get("actions_taken", [])
        ],
        "top_variable_changes": [
            {
                "variable": v["variable_name"],
                "domain": v["domain_name"],
                "change": round(v["change"], 2),
                "violation_before": round(v["initial_violation"], 3),
                "violation_after": round(v["final_violation"], 3),
            }
            for v in top_changes
        ],
        "weather": {
            "city": weather.get("city", "Unknown"),
            "temperature_c": weather.get("temperature"),
            "conditions": weather.get("conditions"),
            "precipitation_mm": weather.get("precipitation"),
        } if weather else None,
    }


def explain_optimization(result: dict, weather: dict | None = None) -> dict:
    """
    Entry point: generate AI explanations for an optimization result.
    Returns dict with keys: action_explanations, report_summary, insights, suggestions.
    Falls back to rule-based text when AI is unavailable.
    """
    try:
        payload = _compact_result(result, weather)
        prompt = f"""You explain results of an environmental sustainability NCV optimizer.
NCV = Normalized Constraint Violation: 0 means fully safe, 100 means critical.
This system computes optimal actions — it does NOT predict; it optimizes.

Optimization data (all numbers are exact):
{json.dumps(payload, indent=2)}

Return ONLY a valid JSON object. No markdown. No extra text:
{{
  "action_explanations": {{
    "<action_id>": "<1-2 sentence plain-English explanation of real-world impact>"
  }},
  "report_summary": "<2-3 sentences: overall improvement, key domains, efficiency insight>",
  "insights": [
    "<dominant constraint or risk factor>",
    "<cross-domain benefit or trade-off>",
    "<efficiency or remaining risk insight>"
  ],
  "suggestions": [
    "<specific next action the operator should consider>",
    "<budget, sequencing, or monitoring recommendation>",
    "<risk mitigation or follow-up data recommendation>"
  ]
}}

Rules:
- Use ONLY the numbers provided above. Never invent values.
- Max 120 characters per action explanation.
- Suggestions must be based on remaining NCV, unused budget, selected actions, rejected actions, or top variable changes.
- Be direct and actionable. Avoid jargon."""

        ai = generate_json_response(prompt, max_tokens=1200)
        return {
            "action_explanations": ai.get("action_explanations", {}),
            "report_summary": ai.get("report_summary", ""),
            "insights": ai.get("insights", [])[:3],
            "suggestions": ai.get("suggestions", [])[:3],
        }

    except Exception as exc:
        logger.warning("AI explainer failed (%s); using fallback.", exc)
        return _fallback(result)


def _fallback(result: dict) -> dict:
    """Rule-based fallback when AI is unavailable or key is not set."""
    action_explanations = {}
    for a in result.get("actions_taken", []):
        app = a.get("application_number", 1)
        dim = f" (application #{app}, diminishing returns applied)" if app > 1 else ""
        action_explanations[a["action_id"]] = (
            f"Reduces NCV by {a['ncv_reduction']:.2f} points in {a['domain_name']}"
            f" at ${a['actual_cost']:,.0f}{dim}."
        )

    pct = result.get("ncv_reduction_pct", 0)
    cost = result.get("budget_used", 0)
    eff = result.get("cost_efficiency", 0) * 1000
    domains = result.get("domains_optimized", [])
    status = result.get("status", "PARTIAL")

    report_summary = (
        f"System improved by {pct:.1f}% across {len(domains)} domain(s) "
        f"with {len(result.get('actions_taken', []))} targeted actions. "
        f"Total investment: ${cost:,.0f}. "
        f"Efficiency: {eff:.3f} NCV points per $1,000 spent. "
        f"Final status: {status}."
    )

    initial = result.get("initial_ncv", 0)
    final = result.get("final_ncv", 0)

    insights = [
        f"NCV reduced from {initial:.1f} to {final:.1f} — a {pct:.1f}% improvement.",
        f"Cost efficiency: {eff:.3f} NCV per $1,000. "
        + ("High efficiency." if eff > 0.5 else "Moderate efficiency."),
        "System reached safe state." if status == "COMPLETE"
        else f"NCV {final:.1f} remains — increase budget or add domain schemas.",
    ]

    return {
        "action_explanations": action_explanations,
        "report_summary": report_summary,
        "insights": insights,
        "suggestions": _fallback_suggestions(result),
    }


def _fallback_suggestions(result: dict) -> list[str]:
    """Rule-based next-step suggestions when AI is unavailable or key is not set."""
    suggestions: list[str] = []
    final = result.get("final_ncv", 0)
    remaining = result.get("budget_remaining", 0)
    rejected = result.get("rejected_actions", [])
    top_changes = sorted(
        result.get("variable_changes", []),
        key=lambda v: v.get("final_violation", 0),
        reverse=True,
    )

    if final > 0 and remaining > 0:
        suggestions.append(
            f"Use the remaining ${remaining:,.0f} on actions targeting the highest remaining violations."
        )
    elif final > 0:
        suggestions.append("Increase the budget or relax constraints to reduce the remaining NCV.")
    else:
        suggestions.append("Maintain monitoring cadence to keep NCV at the safe-state target.")

    if top_changes:
        top = top_changes[0]
        suggestions.append(
            f"Prioritize follow-up monitoring for {top['variable_name']} in {top['domain_name']}."
        )

    if rejected:
        suggestions.append("Review rejected actions; some may become feasible with added budget or policy changes.")
    else:
        suggestions.append("Re-run optimization after new weather, cost, or operational data is available.")

    return suggestions[:3]
