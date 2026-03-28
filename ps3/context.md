# PS3 AutoHeal — Integration Context

> Last updated: 2026-03-28 20:50 IST

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  100.88.95.52 (Nishanth — Orchestrator)                         │
│  ├── FastAPI orchestrator      :8000  ✅ RUNNING                │
│  ├── React Dashboard (Vite)    :3001  ✅ RUNNING                │
│  ├── Prometheus                :9090  ✅ RUNNING                │
│  └── Online Boutique (k8s)     :8080  ✅ RUNNING                │
├──────────────────────────────────────────────────────────────────┤
│  100.81.160.39 (Kushagra — ML Service)                          │
│  └── ML predict_batch          :8001  ✅ CONNECTED               │
├──────────────────────────────────────────────────────────────────┤
│  100.96.255.69 (Cato — Database)                                │
│  ├── PostgreSQL                :5432  ⏳ WAITING (not started)  │
│  └── DB API (uvicorn)          :8005  ✅ RUNNING (no DB behind) │
├──────────────────────────────────────────────────────────────────┤
│  100.81.3.108 (Desktop — Ollama LLM)                            │
│  └── llama3.1:8b               :11434 ✅ RUNNING                │
├──────────────────────────────────────────────────────────────────┤
│  100.116.37.98 (Harshita — was Frontend)                        │
│  └── Frontend is now running on Nishanth's machine :3001        │
└──────────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose | Key Changes Made |
|------|---------|-----------------|
| `ps3/orchestrator/main.py` | Main orchestrator loop | ML_URL from env (→ 100.81.160.39:8001), DB save_incident calls added |
| `ps3/orchestrator/report.py` | LLM postmortem PDF gen | Ollama URL → 100.81.3.108:11434 |
| `ps3/orchestrator/.env` | Env vars | ML_URL, DB_URL, OLLAMA_URL, GEMINI_API_KEY |
| `ps3/orchestrator/state.py` | Shared state (10 services) | Unchanged |
| `ps3/orchestrator/rca.py` | BFS root cause identification | Unchanged |
| `ps3/orchestrator/remediation.py` | K8s remediation actions | Unchanged |
| `ps3/orchestrator/collectors.py` | Prometheus metric collection | Unchanged |
| `ps3/database/db.py` | DB operations (save_incident, etc.) | DB_URL → 100.96.255.69:5432 |
| `ps3/database/api.py` | DB REST API | Unchanged (Cato's machine) |
| `frontend/src/hooks/useOrchestrator.ts` | WebSocket hook | URL → ws://100.88.95.52:8000/ws |
| `frontend/vite.config.ts` | Vite config | host: 0.0.0.0, port: 3001 |

## How to Start Everything

```bash
# 1. Orchestrator (already running)
cd /mnt/hdd/techsols/ps3/orchestrator
source /mnt/hdd/techsols/venv/bin/activate
uvicorn main:app --port 8000 --host 0.0.0.0 --reload

# 2. Frontend (already running)
cd /mnt/hdd/techsols/frontend
source ~/.nvm/nvm.sh && nvm use 20.19.0
npm run dev
# → http://100.88.95.52:3001

# 3. Kushagra's ML (his machine, already running)
# uvicorn main:app --host 0.0.0.0 --port 8001

# 4. Cato's DB — NEEDS POSTGRES STARTED FIRST
# docker-compose up -d  (in ps3/database/)
# Then: uvicorn api:app --host 0.0.0.0 --port 8005
```

## Demo Flow

```bash
# 1. Verify all up
curl -s http://100.88.95.52:8000/health
curl -s http://100.81.160.39:8001/health

# 2. Inject chaos
curl -X POST http://100.88.95.52:8000/chaos/inject

# 3. Wait 10-12 seconds (watch dashboard for paymentservice → red)

# 4. Recover
curl -X POST http://100.88.95.52:8000/chaos/recover

# 5. Check incident
curl -s http://100.88.95.52:8000/incident/latest | python3 -m json.tool
```

## What's Left

- [ ] **Cato**: Start Postgres (`docker-compose up -d`), then restart API
- [ ] **K6 load test**: Run during demo for real traffic
- [ ] **Practice demo flow 3 times end to end**
- [ ] **PDF postmortem**: Will auto-generate on recovery if Ollama is reachable

## DB Integration Notes

The `save_incident` calls in `main.py` are wrapped in try/except — the orchestrator works perfectly fine even when Postgres is down. Once Cato starts Postgres, incidents will automatically start persisting.

The `database` module is symlinked from `ps3/database/` into `ps3/orchestrator/database/` so the import works from the orchestrator's working directory.
