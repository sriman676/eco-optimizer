from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.state import store
from domains.loader import load_domain_from_json_string
from engine.ncv import calculate_global_ncv, calculate_domain_ncv
from models.domain import GlobalStateResponse, DomainStateSnapshot, DomainStateVariable

router = APIRouter(prefix="/api/domains", tags=["domains"])


@router.get("/")
def list_domains():
    return store.list_domain_definitions()


@router.get("/state", response_model=GlobalStateResponse)
def get_global_state():
    defs = store.list_domain_definitions()
    if not defs:
        raise HTTPException(status_code=404, detail="No domains loaded")

    all_vals = {}
    for d in defs:
        state = store.get_domain_state(d["id"])
        all_vals[d["id"]] = state["variables"] if state else {}

    global_ncv, snapshots = calculate_global_ncv(defs, all_vals)

    domain_snapshots = []
    for s in snapshots:
        variables = [
            DomainStateVariable(
                id=v["id"],
                name=v["name"],
                unit=v["unit"],
                value=v["value"],
                normalized_value=v["normalized_value"],
                violation=v["violation"],
                weighted_violation=v["weighted_violation"],
                weight=v["weight"],
                min_safe=v["min_safe"],
                max_safe=v["max_safe"],
                min_value=v["min_value"],
                max_value=v["max_value"],
                higher_is_better=v["higher_is_better"],
            )
            for v in s["variables"]
        ]
        domain_snapshots.append(
            DomainStateSnapshot(
                domain_id=s["domain_id"],
                domain_name=s["domain_name"],
                domain_icon=s["domain_icon"],
                sdg=s["sdg"],
                variables=variables,
                domain_ncv=s["domain_ncv"],
            )
        )

    total_vars = sum(len(s.variables) for s in domain_snapshots)
    in_violation = sum(
        1
        for s in domain_snapshots
        for v in s.variables
        if v.violation > 0
    )

    return GlobalStateResponse(
        domains=domain_snapshots,
        global_ncv=global_ncv,
        total_variables=total_vars,
        variables_in_violation=in_violation,
    )


@router.get("/{domain_id}")
def get_domain(domain_id: str):
    d = store.get_domain_definition(domain_id)
    if d is None:
        raise HTTPException(status_code=404, detail=f"Domain '{domain_id}' not found")
    return d


@router.post("/load")
def load_custom_domain(body: dict):
    """Dynamically load a new domain plugin from JSON at runtime."""
    try:
        import json
        domain = load_domain_from_json_string(json.dumps(body))
        return {"status": "loaded", "domain_id": domain.id, "name": domain.name}
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/reset")
def reset_all_states():
    store.reset_all_states()
    return {"status": "reset", "message": "All domain states restored to initial values"}


@router.post("/{domain_id}/reset")
def reset_domain_state(domain_id: str):
    if store.get_domain_definition(domain_id) is None:
        raise HTTPException(status_code=404, detail=f"Domain '{domain_id}' not found")
    store.reset_domain_state(domain_id)
    return {"status": "reset", "domain_id": domain_id}
