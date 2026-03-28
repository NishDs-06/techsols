# ML Service — Anomaly Detection

> **Competition:** KSuhagra

## Training Data

**File:** `ps3/training_data.csv` — 800 rows, 10 services

### Schema

| Column | Description |
|---|---|
| `timestamp` | Unix epoch (float) |
| `service` | Service name (see list below) |
| `latency_p95` | P95 latency in ms |
| `error_rate` | Error rate (0–1) |
| `cpu` | CPU utilisation (0–1) |
| `memory` | Memory utilisation (0–1) |
| `request_rate` | Requests per second |
| `restart_count` | Pod restart count |
| `replica_gap` | Difference between desired and ready replicas |
| `pod_ready` | 1.0 if pod ready, 0.0 otherwise |
| `label` | **0** = normal, **1** = anomalous |

### Services (10)

```
frontend, cartservice, productcatalog, currencyservice,
checkoutservice, adservice, recommendservice, paymentservice,
shippingservice, emailservice
```

### Label Distribution

- **Normal rows (label=0):** all services under steady-state traffic
- **Anomalous rows (label=1):** `paymentservice` only — high latency (~275–285 ms), elevated error rate (0.201), high CPU (~0.53–0.57)

### Feature Set Used for Training

```
latency_p95, error_rate, cpu, restart_count, replica_gap, pod_ready
```

(`memory` and `request_rate` are present in the CSV but excluded from the feature vector.)

---

## Model Spec

| Property | Value |
|---|---|
| Algorithm | Isolation Forest (unsupervised) |
| Training set | Normal rows only (`label == 0`) |
| Calibration | Conformal prediction — p-values computed against a held-out normal calibration set |
| Anomaly threshold | `p_value < 0.05` |

### `/predict_batch` Endpoint — Port 8001

**Request**
```json
{
  "timestamp": "2026-03-27T22:21:35Z",
  "services": [
    {
      "name": "paymentservice",
      "metrics": {
        "latency_p95": 283.0,
        "error_rate": 0.201,
        "cpu": 0.54,
        "restart_count": 0,
        "replica_gap": 1,
        "pod_ready": 1.0
      },
      "log_features": {"error_count": 0, "error_rate_logs": 0}
    }
  ]
}
```

**Response**
```json
{
  "services": [
    {
      "name": "paymentservice",
      "metric_score": 0.92,
      "log_score": 0.85,
      "final_score": 0.91,
      "p_value": 0.03
    }
  ]
}
```

**SLA:** Model loads at startup. Response time < 200 ms.
