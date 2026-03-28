import os
import json
import psycopg2
import psycopg2.extras
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ps3")

def get_conn():
    return psycopg2.connect(DB_URL)

def init_db():
    """Create tables if they don't exist."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # Assuming schema.sql is in the same directory
                schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
                with open(schema_path, "r") as f:
                    cur.execute(f.read())
            conn.commit()
        logger.info("DB initialized")
    except Exception as e:
        logger.error(f"init_db failed: {e}")

def save_incident(incident: dict):
    """Store incident when it fires."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO incidents (
                        incident_id, root_service, anomaly_confidence,
                        rca_score, affected_services, applied_action,
                        remediation_detail, sla_seconds, actual_seconds,
                        injected_at, detected_at, rca_completed_at,
                        remediation_started_at, recovered_at, paths
                    ) VALUES (
                        %s,%s,%s,%s,%s,%s,%s,%s,%s,
                        %s,%s,%s,%s,%s,%s
                    )
                    ON CONFLICT (incident_id) DO UPDATE SET
                        recovered_at = EXCLUDED.recovered_at,
                        actual_seconds = EXCLUDED.actual_seconds
                """, (
                    incident.get("incident_id"),
                    incident.get("root_service"),
                    incident.get("anomaly_confidence"),
                    incident.get("rca_score"),
                    json.dumps(incident.get("affected_services", [])),
                    incident.get("applied_action"),
                    incident.get("remediation_detail"),
                    incident.get("sla_seconds"),
                    incident.get("actual_seconds"),
                    incident.get("injected_at"),
                    incident.get("detected_at"),
                    incident.get("rca_completed_at"),
                    incident.get("remediation_started_at"),
                    incident.get("recovered_at"),
                    json.dumps(incident.get("paths", [])),
                ))
            conn.commit()
    except Exception as e:
        logger.error(f"save_incident failed: {e}")

def save_metrics_snapshot(service_scores: dict, timestamp: str):
    """Store per-service scores every cycle."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                for svc, v in service_scores.items():
                    m = v.get("metrics", {})
                    cur.execute("""
                        INSERT INTO service_metric_history (
                            service, timestamp, latency_p95, error_rate,
                            cpu, memory, request_rate, restart_count,
                            replica_gap, pod_ready, p_value,
                            anomaly_confidence, status
                        ) VALUES (
                            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                        )
                    """, (
                        svc, timestamp,
                        m.get("latency_p95"),
                        m.get("error_rate"),
                        m.get("cpu"),
                        m.get("memory"),
                        m.get("request_rate"),
                        m.get("restart_count"),
                        m.get("replica_gap"),
                        m.get("pod_ready"),
                        v.get("p_value"),
                        v.get("anomaly_confidence"),
                        v.get("status"),
                    ))
            conn.commit()
    except Exception as e:
        logger.error(f"save_metrics_snapshot failed: {e}")

def update_baselines(service_scores: dict):
    """Recompute baselines from last 7 days of normal data."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                for svc in service_scores:
                    for metric in ["latency_p95", "error_rate", "cpu"]:
                        cur.execute(f"""
                            INSERT INTO baselines (service, metric, value)
                            SELECT service, %s, percentile_cont(0.95)
                                WITHIN GROUP (ORDER BY {metric})
                            FROM service_metric_history
                            WHERE service = %s
                              AND status = 'normal'
                              AND timestamp > NOW() - INTERVAL '7 days'
                            GROUP BY service
                            ON CONFLICT (service, metric)
                            DO UPDATE SET value = EXCLUDED.value,
                                         computed_at = NOW()
                        """, (metric, svc))
            conn.commit()
    except Exception as e:
        logger.error(f"update_baselines failed: {e}")

def get_baselines() -> dict:
    """Load baselines — used instead of hardcoded values."""
    try:
        with get_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("SELECT service, metric, value FROM baselines")
                rows = cur.fetchall()
        result = {}
        for row in rows:
            if row["service"] not in result:
                result[row["service"]] = {}
            result[row["service"]][row["metric"]] = row["value"]
        return result
    except Exception as e:
        logger.error(f"get_baselines failed: {e}")
        return {}

def get_incident_history(limit=20) -> list:
    """Fetch last N incidents for dashboard history view."""
    try:
        with get_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("""
                    SELECT * FROM incidents
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (limit,))
                return [dict(r) for r in cur.fetchall()]
    except Exception as e:
        logger.error(f"get_incident_history failed: {e}")
        return []