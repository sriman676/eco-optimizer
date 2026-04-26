from datetime import datetime, timezone
from core.state import store
from engine.ncv import calculate_global_ncv


def record_snapshot(event_type: str, domain_id: str | None, note: str = "") -> dict:
    """Capture the current global NCV and persist a feedback record."""
    all_defs = store.list_domain_definitions()
    all_vals = {
        d["id"]: state["variables"]
        for d in all_defs
        if (state := store.get_domain_state(d["id"])) is not None
    }
    global_ncv, _ = calculate_global_ncv(all_defs, all_vals)

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "domain_id": domain_id,
        "ncv_snapshot": round(global_ncv, 4),
        "note": note,
    }
    store.add_feedback_record(record)
    return record


def get_ncv_progression() -> list[dict]:
    """Return feedback records ordered by time (oldest first)."""
    return store.get_feedback_records()
