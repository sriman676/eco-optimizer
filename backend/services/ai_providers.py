import json
import logging
from typing import Any

import httpx

from core.config import (
    HUGGINGFACE_API_KEY,
    HUGGINGFACE_BASE_URL,
    HUGGINGFACE_MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_MODEL,
)

logger = logging.getLogger(__name__)


def _is_configured(value: str) -> bool:
    if not value:
        return False
    lowered = value.lower()
    return "placeholder" not in lowered and "your_" not in lowered


def _provider_configs() -> list[dict[str, str]]:
    return [
        {
            "name": "openrouter",
            "api_key": OPENROUTER_API_KEY,
            "base_url": OPENROUTER_BASE_URL.rstrip("/"),
            "model": OPENROUTER_MODEL,
        },
        {
            "name": "huggingface",
            "api_key": HUGGINGFACE_API_KEY,
            "base_url": HUGGINGFACE_BASE_URL.rstrip("/"),
            "model": HUGGINGFACE_MODEL,
        },
    ]


def generate_json_response(prompt: str, max_tokens: int = 1200) -> dict[str, Any]:
    return generate_json_response_from_providers(_provider_configs(), prompt, max_tokens=max_tokens)


def generate_json_response_from_provider(provider_name: str, prompt: str, max_tokens: int = 1200) -> dict[str, Any]:
    provider = next((p for p in _provider_configs() if p["name"] == provider_name), None)
    if provider is None:
        raise RuntimeError(f"Unknown provider '{provider_name}'.")
    return generate_json_response_from_providers([provider], prompt, max_tokens=max_tokens)


def generate_json_response_from_providers(
    providers: list[dict[str, str]],
    prompt: str,
    max_tokens: int = 1200,
) -> dict[str, Any]:
    errors: list[str] = []
    for provider in providers:
        if not _is_configured(provider["api_key"]):
            continue

        try:
            raw = _chat_completion(provider, prompt, max_tokens=max_tokens)
            return json.loads(_extract_json(raw))
        except Exception as exc:
            msg = f"{provider['name']} failed: {exc}"
            errors.append(msg)
            logger.warning(msg)

    if errors:
        raise RuntimeError("; ".join(errors))
    raise RuntimeError("No configured AI provider key found.")


def _chat_completion(provider: dict[str, str], prompt: str, max_tokens: int) -> str:
    headers = {
        "Authorization": f"Bearer {provider['api_key']}",
        "Content-Type": "application/json",
    }
    if provider["name"] == "openrouter":
        headers["HTTP-Referer"] = "http://localhost:3000"
        headers["X-Title"] = "EcoOptimizer"

    payload = {
        "model": provider["model"],
        "messages": [
            {"role": "system", "content": "Return only valid JSON. No markdown."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }

    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            f"{provider['base_url']}/chat/completions",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    return data["choices"][0]["message"]["content"].strip()


def _extract_json(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1].lstrip("json").strip() if len(parts) > 1 else text

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("AI response did not contain a JSON object.")
    return text[start:end + 1]


def get_provider_status() -> list[dict[str, Any]]:
    return [test_provider_auth(provider["name"]) for provider in _provider_configs()]


def test_provider_auth(provider_name: str) -> dict[str, Any]:
    provider = next((p for p in _provider_configs() if p["name"] == provider_name), None)
    if provider is None:
        return {"provider": provider_name, "configured": False, "ok": False, "message": "Unknown provider."}

    if not _is_configured(provider["api_key"]):
        return {"provider": provider_name, "configured": False, "ok": False, "message": "API key not configured."}

    try:
        if provider_name == "openrouter":
            return _test_openrouter(provider)
        if provider_name == "huggingface":
            return _test_huggingface(provider)
        return {"provider": provider_name, "configured": True, "ok": False, "message": "No test implemented."}
    except httpx.HTTPStatusError as exc:
        return {
            "provider": provider_name,
            "configured": True,
            "ok": False,
            "status_code": exc.response.status_code,
            "message": _safe_error_message(exc.response),
        }
    except Exception as exc:
        return {
            "provider": provider_name,
            "configured": True,
            "ok": False,
            "message": str(exc),
        }


def _test_openrouter(provider: dict[str, str]) -> dict[str, Any]:
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(
            f"{provider['base_url']}/key",
            headers={"Authorization": f"Bearer {provider['api_key']}"},
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})

    return {
        "provider": "openrouter",
        "configured": True,
        "ok": True,
        "model": provider["model"],
        "limit_remaining": data.get("limit_remaining"),
        "usage": data.get("usage"),
    }


def _test_huggingface(provider: dict[str, str]) -> dict[str, Any]:
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(
            "https://huggingface.co/api/whoami-v2",
            headers={"Authorization": f"Bearer {provider['api_key']}"},
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "provider": "huggingface",
        "configured": True,
        "ok": True,
        "model": provider["model"],
        "name": data.get("name"),
        "type": data.get("type"),
    }


def _safe_error_message(response: httpx.Response) -> str:
    try:
        data = response.json()
    except Exception:
        return response.text[:300]
    return json.dumps(data)[:500]
