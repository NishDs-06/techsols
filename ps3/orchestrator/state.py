
from collections import deque

SERVICES = [
    "frontend", "cartservice", "productcatalog", "currencyservice",
    "checkoutservice", "adservice", "recommendservice",
    "paymentservice", "shippingservice", "emailservice"
]

# Latest scores from ML — updated every 5s
service_scores = {s: {"p_value": 1.0, "anomaly_confidence": 0.0,
                       "final_score": 0.0, "status": "normal"} for s in SERVICES}

# Latest incident — set when RCA fires
latest_incident = None

# Baseline metrics — set during first few normal cycles
baseline_metrics = {s: {"latency_p95": 80.0, "error_rate": 0.004,
                         "cpu": 0.20} for s in SERVICES}

# Chaos override — when True the orchestrator loop skips ML score updates
chaos_active = False