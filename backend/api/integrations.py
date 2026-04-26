from fastapi import APIRouter

from core.config import OPENROUTER_API_KEY, OPENWEATHER_API_KEY
from services.weather import get_weather
from services.ai_providers import get_provider_status


router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.get("/ai/status")
def ai_status():
    return {
        "providers": get_provider_status(),
        "order": ["openrouter", "huggingface"],
    }


@router.get("/weather/status")
async def weather_status():
    sample = await get_weather("London")
    return {
        "providers": {
            "openweather": {
                "configured": bool(OPENWEATHER_API_KEY and "PLACEHOLDER" not in OPENWEATHER_API_KEY),
            },
            "openrouter": {
                "configured": bool(OPENROUTER_API_KEY and "PLACEHOLDER" not in OPENROUTER_API_KEY),
            },
        },
        "sample": sample,
    }
