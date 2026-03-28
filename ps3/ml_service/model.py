from sklearn.ensemble import IsolationForest
import numpy as np
import joblib


def train_log_model():
    """
    Train ONLY log model (keep metric model untouched)
    """

    print("Training LOG model...")

    # ----------------------------------------
    # 🔹 REALISTIC NORMAL LOG BEHAVIOR
    # ----------------------------------------
    # [error_count, warning_count, error_rate_logs]

    log_data = np.random.normal(
        loc=[2, 1, 0.03],     # normal behavior
        scale=[1, 0.5, 0.015],
        size=(800, 3)
    )

    # ----------------------------------------
    # 🔹 ADD ANOMALIES (IMPORTANT)
    # ----------------------------------------
    anomaly_data = np.random.normal(
        loc=[10, 5, 0.3],     # abnormal spikes
        scale=[3, 2, 0.1],
        size=(100, 3)
    )

    # Combine
    log_data = np.vstack([log_data, anomaly_data])

    # Remove negatives
    log_data = np.clip(log_data, a_min=0, a_max=None)

    print("Log data shape:", log_data.shape)

    # ----------------------------------------
    # 🔹 TRAIN MODEL
    # ----------------------------------------
    IF_logs = IsolationForest(
        n_estimators=120,
        contamination=0.08,
        random_state=42
    )

    IF_logs.fit(log_data)

    # ----------------------------------------
    # 🔹 SAVE MODEL
    # ----------------------------------------
    joblib.dump(IF_logs, "if_logs.pkl")

    print("✅ Log model trained and saved!")


# ----------------------------------------
# 🔹 FINAL SCORING FUNCTION (FIXED)
# ----------------------------------------
def get_anomaly_score(model, features):
    raw_score = model.decision_function([features])[0]

    # Convert to anomaly score (higher = more anomalous)
    score = -raw_score

    # Shift to usable range
    score = score + 0.5

    # Clamp to [0, 1]
    score = max(0.0, min(1.0, score))

    return float(score)


# ----------------------------------------
# 🔹 ENTRY POINT
# ----------------------------------------
if __name__ == "__main__":
    train_log_model()