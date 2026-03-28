def compute_p_value(final_score: float) -> float:
    """
    Stable deterministic p-value mapping.
    Lower p_value = stronger anomaly.
    """
    if final_score >= 0.65:
        return 0.01
    elif final_score >= 0.55:
        return 0.05
    elif final_score >= 0.35:
        return 0.3
    else:
        return 0.7