<<<<<<< HEAD
# PS3 — AI-Powered Incident Detection & Remediation

Microservices anomaly detection system using Prometheus metrics, fake/real ML scoring, root cause analysis, and automated remediation on Kubernetes.

## Prerequisites

- Kubernetes cluster with microservices deployed (Online Boutique or similar)
- Prometheus + Loki running (port-forwarded to `localhost:9090` and `localhost:3100`)
- Python 3.10+ with: `fastapi`, `uvicorn`, `httpx`, `requests`
- Optional: `kubernetes` Python package (for live remediation; simulated without it)

```bash
pip install fastapi uvicorn httpx requests kubernetes
```

---

## Components & How to Run

### 1. Orchestrator (core loop)

The main brain — polls Prometheus every 5s, scores services via ML, runs RCA, and remediates.

```bash
cd ps3/orchestrator
uvicorn main:app --port 8000 --reload
```

**Endpoints:**

| Endpoint              | Description                         |
|-----------------------|-------------------------------------|
| `GET /`               | Health check                        |
| `GET /services`       | Current scores for all 10 services  |
| `GET /incident/latest`| Latest incident details (if any)    |
| `GET /graph`          | Service dependency graph            |
| `GET /health`         | Status + connected WebSocket clients|
| `WS /ws`              | Live WebSocket feed (state + incidents) |

**What to look for:** Once running, orchestrator logs will show:
- `ML service unavailable — using fake scores` (expected if ML service isn't up)
- `Root cause identified: <service>` when a service is unhealthy

### 2. Mock App (simulated backend)

A simple FastAPI app to simulate service behavior for testing.

```bash
cd ps3/mock_app
uvicorn main:app --port 8080 --reload
```

**Endpoints:**

| Endpoint            | Description                              |
|---------------------|------------------------------------------|
| `GET /products`     | Returns products (with random latency)   |
| `GET /users`        | Returns users                            |
| `POST /orders`      | Place an order                           |
| `GET /payment/fail` | Toggle payment failure mode ON (30% 500s)|
| `GET /payment/recover` | Toggle failure mode OFF               |

### 3. Chaos Scripts

Inject faults into the Kubernetes cluster to trigger the orchestrator's detection pipeline.

#### Kill Payment Service (scale to 0)
```bash
kubectl scale deployment paymentservice -n default --replicas=0
```

#### Restore Payment Service
```bash
kubectl scale deployment paymentservice -n default --replicas=1
```

#### CPU Throttle
```bash
bash ps3/chaos/throttle.sh
```
Patches `paymentservice` CPU limit to 50m, causing throttling and triggering anomaly detection.

---

## Port Forwards Required

Before running, ensure these are active in separate terminals:

```bash
# Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Loki (if installed)
kubectl port-forward -n monitoring svc/loki 3100:3100
```

---

## Quick Test (End-to-End)

```bash
# Terminal 1 — Start orchestrator
cd ps3/orchestrator && uvicorn main:app --port 8000 --reload

# Terminal 2 — Inject chaos
kubectl scale deployment paymentservice -n default --replicas=0

# Terminal 2 — Wait 10s then check
sleep 10
curl -s http://localhost:8000/incident/latest | python3 -m json.tool

# Expected: incident JSON with "root_service": "paymentservice"

# Terminal 2 — Recover
kubectl scale deployment paymentservice -n default --replicas=1
sleep 15
curl -s http://localhost:8000/incident/latest | python3 -m json.tool

# Expected: incident with "recovered_at" populated
```

---

## Architecture

```
Prometheus/Loki ──▶ collectors.py ──▶ main.py (orchestrator loop)
                                          │
                                     _fake_ml_scores() or ML service (:8001)
                                          │
                                     rca.py (identify_root_cause)
                                          │
                                     remediation.py (scale_up / restart_pod)
                                          │
                                     WebSocket broadcast ──▶ Frontend
```

**Services monitored:** frontend, cartservice, productcatalog, currencyservice, checkoutservice, adservice, recommendservice, paymentservice, shippingservice, emailservice
=======
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
>>>>>>> 7e6df86 (feat: enhance dashboard with SLA timer and cluster vitals)
