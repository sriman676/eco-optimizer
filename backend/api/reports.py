from fastapi import APIRouter, HTTPException
from core.state import store
from services.feedback import get_ncv_progression

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/")
def list_reports():
    history = store.get_optimization_history()
    return [
        {
            "id": r["id"],
            "timestamp": r["timestamp"],
            "domains_optimized": r["domains_optimized"],
            "initial_ncv": r["initial_ncv"],
            "final_ncv": r["final_ncv"],
            "ncv_reduction_pct": r["ncv_reduction_pct"],
            "budget_used": r["budget_used"],
            "total_iterations": r["total_iterations"],
            "stopped_reason": r["stopped_reason"],
        }
        for r in history
    ]


@router.get("/latest")
def get_latest_report():
    report = store.get_latest_optimization()
    if report is None:
        raise HTTPException(status_code=404, detail="No optimization runs yet")
    return report


@router.get("/feedback")
def get_feedback():
    return get_ncv_progression()


@router.get("/{report_id}")
def get_report(report_id: str):
    for r in store.get_optimization_history():
        if r["id"] == report_id:
            return r
    raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found")
