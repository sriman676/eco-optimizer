from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
import os
import socket
import subprocess

from domains.loader import load_all_domains
from api.domains import router as domains_router
from api.optimize import router as optimize_router
from api.weather import router as weather_router
from api.reports import router as reports_router
from api.integrations import router as integrations_router
from services.feedback import record_snapshot


def _is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex((host, port)) == 0


def _autostart_frontend_if_needed() -> None:
    auto_sync = os.getenv("AUTO_SYNC_SERVICES", "true").lower() not in {"0", "false", "no"}
    if not auto_sync:
        return

    if _is_port_open(3000):
        return

    frontend_dir = Path(__file__).resolve().parents[1] / "frontend"
    if not frontend_dir.exists():
        return

    cmd = ["cmd", "/c", "npm run dev -- -p 3000"]
    creation_flags = 0
    if os.name == "nt":
        creation_flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP

    try:
        subprocess.Popen(
            cmd,
            cwd=str(frontend_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creation_flags,
        )
        print("[startup] Frontend was not running on :3000, started it automatically.")
    except Exception as exc:
        print(f"[startup] Failed to auto-start frontend: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _autostart_frontend_if_needed()
    domains = load_all_domains()
    record_snapshot("system_startup", None, f"Loaded {len(domains)} domain plugins")
    print(f"[startup] Loaded {len(domains)} domain plugins: {[d.id for d in domains]}")
    yield


app = FastAPI(
    title="EcoOptimizer API",
    description="Real-time environmental sustainability optimization engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",      # Next.js fallback port
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(domains_router)
app.include_router(optimize_router)
app.include_router(weather_router)
app.include_router(reports_router)
app.include_router(integrations_router)


@app.get("/")
def root():
    return {
        "service": "EcoOptimizer API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
