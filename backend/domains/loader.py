import json
import os
from pathlib import Path

from core.config import DOMAINS_SCHEMA_DIR
from core.state import store
from models.domain import Domain


def load_domain_from_dict(data: dict) -> Domain:
    return Domain(**data)


def load_all_domains() -> list[Domain]:
    """Scan DOMAINS_SCHEMA_DIR for every .json file and load as a plugin."""
    schema_dir = Path(DOMAINS_SCHEMA_DIR)
    if not schema_dir.exists():
        raise RuntimeError(f"Domain schema directory not found: {schema_dir}")

    domains: list[Domain] = []
    for path in sorted(schema_dir.glob("*.json")):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        domain = load_domain_from_dict(data)
        _register_domain(domain)
        domains.append(domain)

    return domains


def load_domain_from_json_string(json_str: str) -> Domain:
    """Dynamically load a new domain plugin from a JSON string at runtime."""
    data = json.loads(json_str)
    domain = load_domain_from_dict(data)
    _register_domain(domain)
    return domain


def _register_domain(domain: Domain) -> None:
    definition = domain.model_dump()
    initial_state = {
        "variables": {v.id: v.value for v in domain.variables}
    }
    store.register_domain(domain.id, definition, initial_state)
