import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

def _clean_env(name: str, default: str = "") -> str:
    value = os.getenv(name, default)
    return value.strip().strip('"').strip("'")


OPENWEATHER_API_KEY = _clean_env("OPENWEATHER_API_KEY", "PLACEHOLDER_KEY")
ANTHROPIC_API_KEY = _clean_env("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = _clean_env("OPENAI_API_KEY", "")
HUGGINGFACE_API_KEY = _clean_env("HUGGINGFACE_API_KEY", ANTHROPIC_API_KEY)
OPENROUTER_API_KEY = _clean_env("OPENROUTER_API_KEY", OPENAI_API_KEY)
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/auto")
HUGGINGFACE_BASE_URL = os.getenv("HUGGINGFACE_BASE_URL", "https://router.huggingface.co/v1")
HUGGINGFACE_MODEL = os.getenv("HUGGINGFACE_MODEL", "openai/gpt-oss-120b:fastest")
WEATHER_CACHE_TTL_SECONDS = 600  # 10 minutes
MAX_OPTIMIZER_ITERATIONS = 200
NCV_CONVERGENCE_THRESHOLD = 0.01
DOMAINS_SCHEMA_DIR = str(BACKEND_DIR / "domains" / "schemas")
