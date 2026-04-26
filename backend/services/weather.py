import httpx
from datetime import datetime, timezone

from core.config import OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL
from core.cache import weather_cache
from services.ai_providers import generate_json_response_from_provider

FALLBACK_WEATHER = {
    "city": "Global Average",
    "temperature": 25.0,
    "humidity": 60.0,
    "precipitation": 5.0,
    "wind_speed": 10.0,
    "conditions": "Clear",
    "is_simulated": True,
    "cached": False,
    "timestamp": "",
}


async def get_weather(city: str) -> dict:
    cache_key = f"weather:{city.lower().strip()}"
    cached = weather_cache.get(cache_key)
    if cached:
        cached["cached"] = True
        return cached

    if OPENWEATHER_API_KEY == "PLACEHOLDER_KEY":
        return await _weather_via_openrouter(city)

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                OPENWEATHER_BASE_URL,
                params={"q": city, "appid": OPENWEATHER_API_KEY, "units": "metric"},
            )
            resp.raise_for_status()
            raw = resp.json()
    except Exception:
        return await _weather_via_openrouter(city)

    # OpenWeatherMap does not include hourly precipitation in /weather;
    # use rain.1h if available, otherwise 0
    precip = raw.get("rain", {}).get("1h", 0.0)

    result = {
        "city": raw.get("name", city),
        "temperature": raw["main"]["temp"],
        "humidity": raw["main"]["humidity"],
        "precipitation": precip,
        "wind_speed": raw["wind"]["speed"],
        "conditions": raw["weather"][0]["description"].title() if raw.get("weather") else "Unknown",
        "is_simulated": False,
        "cached": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "openweather",
    }
    weather_cache.set(cache_key, result)
    return result


async def _weather_via_openrouter(city: str) -> dict:
    if not OPENROUTER_API_KEY or "PLACEHOLDER" in OPENROUTER_API_KEY or "your_" in OPENROUTER_API_KEY.lower():
        return _simulated_weather(city)

    prompt = f"""
Generate a realistic simulated weather snapshot for {city}.
This is for application fallback only, so do not claim it is live weather.
Return only JSON with these fields:
{{
  "city": "{city}",
  "temperature": number,
  "humidity": number,
  "precipitation": number,
  "wind_speed": number,
  "conditions": string
}}

Rules:
- Temperature in Celsius.
- Humidity as a percentage 0-100.
- Precipitation in mm.
- Wind speed in m/s.
- Keep values plausible for the city and season.
"""

    try:
        ai = generate_json_response_from_provider("openrouter", prompt, max_tokens=250)
        result = {
            "city": str(ai.get("city", city)),
            "temperature": float(ai.get("temperature", 25.0)),
            "humidity": float(ai.get("humidity", 60.0)),
            "precipitation": float(ai.get("precipitation", 5.0)),
            "wind_speed": float(ai.get("wind_speed", 10.0)),
            "conditions": str(ai.get("conditions", "Unknown")),
            "is_simulated": True,
            "cached": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "openrouter",
        }
        weather_cache.set(f"weather:{city.lower().strip()}", result)
        return result
    except Exception:
        return _simulated_weather(city)


def _simulated_weather(city: str) -> dict:
    """Deterministic simulated data keyed on city name length (for variety)."""
    seed = sum(ord(c) for c in city.lower()) % 7
    presets = [
        {"temperature": 28.0, "humidity": 75.0, "precipitation": 15.0, "wind_speed": 8.0, "conditions": "Tropical Rain"},
        {"temperature": 22.0, "humidity": 55.0, "precipitation": 0.0, "wind_speed": 12.0, "conditions": "Clear"},
        {"temperature": 18.0, "humidity": 80.0, "precipitation": 20.0, "wind_speed": 15.0, "conditions": "Overcast"},
        {"temperature": 35.0, "humidity": 30.0, "precipitation": 0.0, "wind_speed": 5.0, "conditions": "Hot & Dry"},
        {"temperature": 25.0, "humidity": 65.0, "precipitation": 5.0, "wind_speed": 10.0, "conditions": "Partly Cloudy"},
        {"temperature": 12.0, "humidity": 90.0, "precipitation": 30.0, "wind_speed": 20.0, "conditions": "Heavy Rain"},
        {"temperature": 30.0, "humidity": 50.0, "precipitation": 2.0, "wind_speed": 7.0, "conditions": "Sunny"},
    ]
    data = {
        "city": city,
        **presets[seed],
        "is_simulated": True,
        "cached": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "local_simulation",
    }
    weather_cache.set(f"weather:{city.lower().strip()}", data)
    return data


def build_region_modifiers(weather: dict, domain_definitions: list[dict]) -> dict[str, dict[str, float]]:
    """
    For each domain variable that has a weather_modifier, compute a region modifier
    based on current weather conditions.  Modifier > 1 means the violation weight
    is amplified (e.g. water scarcity more critical in dry regions).
    """
    modifiers: dict[str, dict[str, float]] = {}
    weather_params = {
        "temperature": weather.get("temperature", 25.0),
        "humidity": weather.get("humidity", 60.0),
        "precipitation": weather.get("precipitation", 5.0),
        "wind_speed": weather.get("wind_speed", 10.0),
    }

    for dom in domain_definitions:
        dom_mods: dict[str, float] = {}
        for wm in dom.get("weather_modifiers", []):
            param_val = weather_params.get(wm["weather_param"], wm["baseline"])
            # modifier: normalise deviation from baseline → scale to [0.8, 1.5]
            deviation = abs(param_val - wm["baseline"]) / max(wm["baseline"], 1.0)
            region_mod = 1.0 + min(0.5, deviation * abs(wm["coefficient"]) * 10)
            dom_mods[wm["variable_id"]] = round(region_mod, 4)
        modifiers[dom["id"]] = dom_mods

    return modifiers
