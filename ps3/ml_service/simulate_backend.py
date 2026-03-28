import requests
import time

ML_URL = "http://127.0.0.1:8001/predict_batch"

def generate_dummy_data():
    return {
        "timestamp": "2026-03-28T05:05:01Z",
        "services": [
            {
                "name": "paymentservice",
                "metrics": {
                    "cpu": 0.9,
                    "memory": 0.85,
                    "latency_p95": 300,
                    "error_rate": 0.05,
                    "request_rate": 120
                },
                "log_features": {
                    "error_count": 20,
                    "warning_count": 5,
                    "error_rate_logs": 0.3
                }
            }
        ]
    }


while True:
    data = generate_dummy_data()

    response = requests.post(ML_URL, json=data)
    result = response.json()

    for svc in result["services"]:
        name = svc["name"]
        p_value = svc["p_value"]

        print(f"{name} → p_value: {p_value}")

        if p_value < 0.05:
            print(f"🚨 ANOMALY DETECTED in {name}")

    time.sleep(5)