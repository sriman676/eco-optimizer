from pydantic import BaseModel, Field
from typing import List, Optional


class WeatherModifier(BaseModel):
    variable_id: str
    weather_param: str          # e.g. "precipitation", "temperature", "humidity"
    coefficient: float          # delta = (param_value - baseline) * coefficient
    baseline: float = 50.0


class VariableEffect(BaseModel):
    variable_id: str
    delta: float                # absolute change in variable value


class DomainVariable(BaseModel):
    id: str
    name: str
    unit: str
    value: float
    min_value: float = 0.0
    max_value: float = 100.0
    min_safe: float             # below this → violation
    max_safe: float             # above this → violation
    weight: float = Field(ge=0.0, le=1.0)
    higher_is_better: bool = True
    weather_sensitive: bool = False


class DomainAction(BaseModel):
    id: str
    name: str
    description: str
    cost: float
    effects: List[VariableEffect]
    max_applications: int = 3
    diminishing_factor: float = Field(default=0.7, ge=0.0, le=1.0)


class Domain(BaseModel):
    id: str
    name: str
    sdg: List[int]
    description: str
    icon: str = "🌍"
    variables: List[DomainVariable]
    actions: List[DomainAction]
    weather_modifiers: Optional[List[WeatherModifier]] = []


class DomainStateVariable(BaseModel):
    id: str
    name: str
    unit: str
    value: float
    normalized_value: float         # 0–100 scale
    violation: float                # 0.0–1.0
    weighted_violation: float
    weight: float
    min_safe: float
    max_safe: float
    min_value: float
    max_value: float
    higher_is_better: bool


class DomainStateSnapshot(BaseModel):
    domain_id: str
    domain_name: str
    domain_icon: str
    sdg: List[int]
    variables: List[DomainStateVariable]
    domain_ncv: float               # 0–100


class GlobalStateResponse(BaseModel):
    domains: List[DomainStateSnapshot]
    global_ncv: float
    total_variables: int
    variables_in_violation: int
