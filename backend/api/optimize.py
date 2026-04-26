from fastapi import APIRouter, HTTPException

from core.state import store
from engine.addons import enrich_optimization_result, prepare_addon_run
from engine.optimizer import run_greedy_optimization
from models.optimization import OptimizationRequest
from services.feedback import record_snapshot
from services.ai_explainer import explain_optimization
from services.weather import weather_cache, get_weather

router = APIRouter(prefix="/api/optimize", tags=["optimize"])


@router.post("/")
async def run_optimization(req: OptimizationRequest):
    for did in req.domain_ids:
        if store.get_domain_definition(did) is None:
            raise HTTPException(status_code=404, detail=f"Domain '{did}' not found")

    # Gather all state BEFORE the loop — no API calls inside optimization
    domain_defs = {did: store.get_domain_definition(did) for did in req.domain_ids}
    initial_values = {}
    for did in req.domain_ids:
        state = store.get_domain_state(did)
        initial_values[did] = state["variables"] if state else {}

    # Resolve weather context for this run using the selected city first.
    latest_weather: dict | None = None
    weather_city = (req.weather_city or "London").strip()
    city_cache_key = f"weather:{weather_city.lower()}"
    for key in [city_cache_key, "weather:london", "weather:global average"]:
        hit = weather_cache.get(key)
        if hit:
            latest_weather = hit
            break

    if latest_weather is None:
        try:
            latest_weather = await get_weather(weather_city)
        except Exception:
            latest_weather = None

    record_snapshot("pre_optimization", None, f"Domains: {req.domain_ids}")

    filtered_defs, runtime = prepare_addon_run(req, domain_defs)

    # ── Core optimizer — deterministic, unchanged ──
    result = run_greedy_optimization(
        domain_ids=req.domain_ids,
        domain_definitions=filtered_defs,
        initial_variable_values=initial_values,
        budget=runtime["effective_budget"],
        max_iterations=runtime["effective_max_iterations"],
        target_ncv=runtime["effective_target_ncv"],
    )

    result = enrich_optimization_result(result, domain_defs, initial_values, runtime, latest_weather)

    # ── AI explanation layer (post-processing only, never modifies decisions) ──
    ai_output = explain_optimization(result, latest_weather)
    result["ai_action_explanations"] = ai_output["action_explanations"]
    result["ai_report_summary"] = ai_output["report_summary"]
    result["ai_insights"] = ai_output["insights"]
    result["ai_suggestions"] = ai_output["suggestions"]

    if not req.preview_only:
        # Persist optimized state
        for did in req.domain_ids:
            final_snap = next((s for s in result["final_state"] if s["domain_id"] == did), None)
            if final_snap:
                new_vars = {v["id"]: v["value"] for v in final_snap["variables"]}
                store.set_domain_state(did, {"variables": new_vars})

        record_snapshot(
            "post_optimization", None,
            f"NCV: {result['initial_ncv']} → {result['final_ncv']} | status={result['status']}"
        )

        store.add_optimization_record(result)
    return result
