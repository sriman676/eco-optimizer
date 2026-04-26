def normalize(value: float, min_val: float, max_val: float) -> float:
    """Map a raw variable value onto a 0–100 scale."""
    span = max_val - min_val
    if span == 0:
        return 0.0
    return max(0.0, min(100.0, (value - min_val) / span * 100.0))


def denormalize(norm: float, min_val: float, max_val: float) -> float:
    """Convert a 0–100 normalised value back to raw units."""
    return min_val + (norm / 100.0) * (max_val - min_val)


def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))
