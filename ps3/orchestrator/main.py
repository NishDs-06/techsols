
import asyncio
import httpx
import json
import logging
import time
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from graph import SERVICE_GRAPH
from rca import identify_root_cause, get_impact_path
from remediation import remediate
from collectors import collect_all_features
from report import generate_incident_report
import state

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ML_URL = "http://localhost:8001/predict_batch"
POLL_INTERVAL = 5  # seconds

connected_clients: list[WebSocket] = []

# ── Broadcast helpers ──────────────────────────────────────────────────────────

async def broadcast(message: dict):
    dead = []
    for ws in connected_clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connected_clients.remove(ws)

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

# ── Status helper ──────────────────────────────────────────────────────────────

def score_to_status(confidence: float, is_root: bool = False) -> str:
    if is_root:
        return "root_cause"
    if confidence < 0.50:
        return "normal"
    if confidence < 0.80:
        return "warning"
    if confidence < 0.95:
        return "critical"
    return "critical"

# ── Main orchestrator loop ─────────────────────────────────────────────────────

async def orchestrator_loop():
    logger.info("Orchestrator loop started")
    incident_active = False
    incident_start_ts = None
    last_root = None
    cooldown_until = 0  # epoch seconds — ignore new incidents until this time

    while True:
        t_start = time.time()
        ts = now_iso()

        try:
            # 1. Collect features from Prometheus + Loki
            features = collect_all_features(list(state.service_scores.keys()))

            # 2. Call ML service
            if not state.chaos_active:
                ml_scores = await call_ml_service(features, ts)

                # 3. Update shared state
                for svc_data in ml_scores:
                    svc = svc_data["name"]
                    confidence = 1 - svc_data["p_value"]
                    state.service_scores[svc] = {
                        "p_value": svc_data["p_value"],
                        "anomaly_confidence": confidence,
                        "final_score": svc_data["final_score"],
                        "status": score_to_status(confidence),
                        "metrics": next(
                            (f["metrics"] for f in features if f["name"] == svc), {})
                    }
            else:
                logger.info("Chaos active — skipping ML update to preserve injected anomaly")

            # 4. Broadcast heartbeat state
            await broadcast({
                "type": "state",
                "timestamp": ts,
                "services": [
                    {
                        "name": svc,
                        "anomaly_confidence": v["anomaly_confidence"],
                        "status": v["status"]
                    }
                    for svc, v in state.service_scores.items()
                ]
            })

            # 5. RCA — skip if in post-recovery cooldown
            ml_scores_dict = {s: state.service_scores[s]
                              for s in state.service_scores}
            root, affected = identify_root_cause(ml_scores_dict)
            if time.time() < cooldown_until:
                root = None  # suppress new incidents during cooldown

            # 6. If new root cause found → remediate + broadcast incident
            if root and root != last_root:
                last_root = root
                incident_start_ts = ts
                incident_active = True

                logger.info(f"Root cause identified: {root}")

                # Mark root in state
                state.service_scores[root]["status"] = "root_cause"

                rca_ts = now_iso()

                # Remediate
                rem_result = remediate(root, state.service_scores)
                rem_ts = now_iso()

                paths = get_impact_path(root, affected)

                # Suggest action text
                action_text = {
                    "scale_up": f"Scaled {root} replicas +2",
                    "restart_pod": f"Restarted {root} pod"
                }.get(rem_result.get("action", ""), "Remediation applied")

                incident = {
                    "type": "incident",
                    "incident_id": f"inc-{ts}",
                    "injected_at": ts,
                    "detected_at": ts,
                    "rca_completed_at": rca_ts,
                    "remediation_started_at": rem_ts,
                    "recovered_at": None,
                    "root_service": root,
                    "rca_score": round(
                        state.service_scores[root]["anomaly_confidence"] *
                        (1 + len(affected)), 2),
                    "anomaly_confidence": round(
                        state.service_scores[root]["anomaly_confidence"], 2),
                    "affected_services": list(affected),
                    "paths": paths,
                    "metrics": {
                        root: {
                            "latency_p95": {
                                "current": state.service_scores[root]
                                    ["metrics"].get("latency_p95", 0),
                                "baseline": state.baseline_metrics[root]["latency_p95"]
                            },
                            "error_rate": {
                                "current": state.service_scores[root]
                                    ["metrics"].get("error_rate", 0),
                                "baseline": state.baseline_metrics[root]["error_rate"]
                            },
                            "cpu": {
                                "current": state.service_scores[root]
                                    ["metrics"].get("cpu", 0),
                                "baseline": state.baseline_metrics[root]["cpu"]
                            }
                        }
                    },
                    "applied_action": rem_result.get("action", "unknown"),
                    "remediation_detail": action_text,
                    "sla_seconds": 15,
                    "actual_seconds": None
                }

                state.latest_incident = incident
                await broadcast(incident)

            # 7. Check if recovered — all services back to normal
            elif last_root and not root:
                if state.latest_incident and not state.latest_incident.get("recovered_at"):
                    recovered_ts = now_iso()
                    state.latest_incident["recovered_at"] = recovered_ts
                    # Compute actual seconds
                    start = datetime.fromisoformat(
                        state.latest_incident["injected_at"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(recovered_ts.replace("Z", "+00:00"))
                    actual = round((end - start).total_seconds(), 1)
                    state.latest_incident["actual_seconds"] = actual

                    for svc in state.service_scores:
                        state.service_scores[svc]["status"] = "recovered"

                    await broadcast({**state.latest_incident, "type": "incident"})
                    logger.info(f"System recovered in {actual}s")
                    cooldown_until = time.time() + 120  # 2-min cooldown
                    # Generate PDF postmortem in background
                    asyncio.create_task(
                        generate_incident_report(dict(state.latest_incident))
                    )
                last_root = None

        except Exception as e:
            logger.error(f"Orchestrator loop error: {e}")

        elapsed = time.time() - t_start
        await asyncio.sleep(max(0, POLL_INTERVAL - elapsed))

async def call_ml_service(features, ts):
    """Call Kushagra's ML service. Falls back to fake scores if unavailable."""
    payload = {"timestamp": ts, "services": features}
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.post(ML_URL, json=payload)
            return r.json()["services"]
    except Exception:
        logger.warning("ML service unavailable — using fake scores")
        return _fake_ml_scores(features)

def _fake_ml_scores(features):
    import random
    result = []
    for f in features:
        m = f.get("metrics", {})
        error_rate = m.get("error_rate", 0.001)
        replica_gap = m.get("replica_gap", 0)
        pod_ready = m.get("pod_ready", 1.0)
        latency = m.get("latency_p95", 80)
        score = 0.05
        score += min(error_rate * 2.0, 0.6)
        score += min(replica_gap * 0.4, 0.4)
        score += (1 - pod_ready) * 0.3
        score += max(0, (latency - 200) / 1000)
        score = min(score + random.uniform(-0.02, 0.02), 0.999)
        result.append({
            "name": f["name"],
            "metric_score": score,
            "log_score": score * 0.9,
            "final_score": score,
            "p_value": max(0.001, 1 - score)
        })
    return result

# ── FastAPI app ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(orchestrator_loop())
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "orchestrator running", "version": "1.0"}

@app.get("/services")
def get_services():
    return state.service_scores

@app.get("/graph")
def get_graph():
    return SERVICE_GRAPH

@app.get("/incident/latest")
def get_latest_incident():
    return state.latest_incident or {"message": "no incident yet"}

@app.get("/health")
def health():
    return {"status": "ok", "connected_clients": len(connected_clients)}

@app.post("/chaos/inject")
def chaos_inject():
    """Directly inject anomalous scores into paymentservice for testing."""
    state.chaos_active = True
    state.service_scores["paymentservice"].update({
        "p_value": 0.01,
        "anomaly_confidence": 0.99,
        "final_score": 0.99,
        "status": "critical",
        "metrics": {
            "latency_p95": 283.0,
            "error_rate": 0.201,
            "cpu": 0.55,
            "restart_count": 0,
            "replica_gap": 1,
            "pod_ready": 1.0,
        }
    })
    logger.info("Chaos injected: paymentservice marked anomalous")
    return {"status": "injected", "service": "paymentservice"}

@app.post("/chaos/recover")
def chaos_recover():
    """Reset paymentservice back to normal scores."""
    state.chaos_active = False
    state.service_scores["paymentservice"].update({
        "p_value": 0.9,
        "anomaly_confidence": 0.1,
        "final_score": 0.1,
        "status": "normal",
        "metrics": {
            "latency_p95": 80.0,
            "error_rate": 0.001,
            "cpu": 0.2,
            "restart_count": 0,
            "replica_gap": 0,
            "pod_ready": 1.0,
        }
    })
    logger.info("Chaos cleared: paymentservice reset to normal")
    return {"status": "recovered", "service": "paymentservice"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.append(ws)
    logger.info(f"Client connected. Total: {len(connected_clients)}")

    # Send current state immediately on connect
    await ws.send_json({
        "type": "state",
        "timestamp": now_iso(),
        "services": [
            {"name": svc, "anomaly_confidence": v["anomaly_confidence"],
             "status": v["status"]}
            for svc, v in state.service_scores.items()
        ]
    })

    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        connected_clients.remove(ws)
        logger.info(f"Client disconnected. Total: {len(connected_clients)}")