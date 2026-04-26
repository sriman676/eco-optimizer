import copy
from typing import Any

class InMemoryStore:
    """Single source of truth for all runtime state."""

    def __init__(self):
        self._domain_definitions: dict[str, dict] = {}   # loaded from JSON plugins
        self._domain_states: dict[str, dict] = {}         # mutable variable values
        self._initial_states: dict[str, dict] = {}        # snapshot at load time
        self._optimization_history: list[dict] = []
        self._feedback_records: list[dict] = []

    # ---------- domain registry ----------

    def register_domain(self, domain_id: str, definition: dict, initial_state: dict) -> None:
        self._domain_definitions[domain_id] = copy.deepcopy(definition)
        self._domain_states[domain_id] = copy.deepcopy(initial_state)
        self._initial_states[domain_id] = copy.deepcopy(initial_state)

    def get_domain_definition(self, domain_id: str) -> dict | None:
        return copy.deepcopy(self._domain_definitions.get(domain_id))

    def list_domain_definitions(self) -> list[dict]:
        return [copy.deepcopy(d) for d in self._domain_definitions.values()]

    # ---------- mutable state ----------

    def get_domain_state(self, domain_id: str) -> dict | None:
        return copy.deepcopy(self._domain_states.get(domain_id))

    def set_domain_state(self, domain_id: str, state: dict) -> None:
        self._domain_states[domain_id] = copy.deepcopy(state)

    def get_all_states(self) -> dict[str, dict]:
        return copy.deepcopy(self._domain_states)

    def get_initial_state(self, domain_id: str) -> dict | None:
        return copy.deepcopy(self._initial_states.get(domain_id))

    def reset_domain_state(self, domain_id: str) -> None:
        if domain_id in self._initial_states:
            self._domain_states[domain_id] = copy.deepcopy(self._initial_states[domain_id])

    def reset_all_states(self) -> None:
        for domain_id in self._initial_states:
            self._domain_states[domain_id] = copy.deepcopy(self._initial_states[domain_id])

    # ---------- optimization history ----------

    def add_optimization_record(self, record: dict) -> None:
        self._optimization_history.append(copy.deepcopy(record))

    def get_optimization_history(self) -> list[dict]:
        return copy.deepcopy(self._optimization_history)

    def get_latest_optimization(self) -> dict | None:
        if not self._optimization_history:
            return None
        return copy.deepcopy(self._optimization_history[-1])

    # ---------- feedback ----------

    def add_feedback_record(self, record: dict) -> None:
        self._feedback_records.append(copy.deepcopy(record))

    def get_feedback_records(self) -> list[dict]:
        return copy.deepcopy(self._feedback_records)


store = InMemoryStore()
