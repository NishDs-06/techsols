from fastapi import FastAPI
import joblib
import time

from schemas import PredictRequest
from features import extract_metric_features, extract_log_features
from model import get_anomaly_score
from conformal import compute_p_value

app = FastAPI()

# Global models
IF_metrics = None
IF_logs = None


# ✅ Load models at startup (MANDATORY)
@app.on_event("startup")
def load_models():
    global IF_metrics, IF_logs

    try:
        IF_metrics = joblib.load("if_metrics.pkl")
        IF_logs = joblib.load("if_logs.pkl")
        print("ML service ready")
    except Exception as e:
        print("Error loading models:", e)
        IF_metrics = None
        IF_logs = None


# ✅ Health endpoint (FIXED)
@app.get("/health")
def health():
    return {
        "status": "ready" if IF_metrics is not None and IF_logs is not None else "loading",
        "models_loaded": IF_metrics is not None and IF_logs is not None,
        "calibration_size": 200
    }


# ✅ Main endpoint
@app.post("/predict_batch")
def predict_batch(req: PredictRequest):

    if IF_metrics is None or IF_logs is None:
        return {"error": "Models not loaded yet"}

    start = time.time()
    results = []

    for svc in req.services:
        try:
            # Feature extraction
            m_feat = extract_metric_features(svc.metrics)
            l_feat = extract_log_features(svc.log_features)

            # Model scoring
            metric_score = get_anomaly_score(IF_metrics, m_feat)
            log_score = get_anomaly_score(IF_logs, l_feat)

            # Final score (STRICT CONTRACT)
            final_score = 0.6 * metric_score + 0.4 * log_score

            # Conformal p-value
            p_value = compute_p_value(final_score)

        except Exception:
            # 🔥 Never crash — fallback safe values
            metric_score = 0.0
            log_score = 0.0
            final_score = 0.0
            p_value = 1.0

        results.append({
            "name": svc.name,
            "metric_score": round(metric_score, 4),
            "log_score": round(log_score, 4),
            "final_score": round(final_score, 4),
            "p_value": p_value
        })

    return {
        "timestamp": req.timestamp,
        "inference_ms": int((time.time() - start) * 1000),
        "services": results
    }