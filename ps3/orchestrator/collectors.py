import requests
import time
import random
import logging

logger = logging.getLogger(__name__)
PROM = "http://localhost:9090"
LOKI = "http://localhost:3100"

POD_PREFIX_MAP = {
    "checkoutservice": "checkoutservice",
    "shippingservice": "shippingservice",
    "cartservice": "cartservice",
    "currencyservice": "currencyservice",
    "frontend": "frontend",
    "productcatalogservice": "productcatalog",
    "recommendationservice": "recommendservice",
    "adservice": "adservice",
    "emailservice": "emailservice",
    "paymentservice": "paymentservice",
}

DEPLOYMENT_MAP = {
    "frontend": "frontend",
    "cartservice": "cartservice",
    "productcatalogservice": "productcatalog",
    "checkoutservice": "checkoutservice",
    "shippingservice": "shippingservice",
    "paymentservice": "paymentservice",
    "emailservice": "emailservice",
    "recommendationservice": "recommendservice",
    "adservice": "adservice",
    "currencyservice": "currencyservice",
}

# Normal replica count per service (what we expect)
EXPECTED_REPLICAS = {svc: 1 for svc in DEPLOYMENT_MAP.values()}

def prom_query_all(promql):
    try:
        r = requests.get(f"{PROM}/api/v1/query",
                         params={"query": promql}, timeout=2)
        return r.json()["data"]["result"]
    except Exception:
        return []

def pod_to_service(pod_name):
    for prefix, svc in POD_PREFIX_MAP.items():
        if pod_name.startswith(prefix):
            return svc
    return None

def get_restart_counts():
    results = prom_query_all(
        'kube_pod_container_status_restarts_total{namespace="default"}')
    restarts = {}
    for r in results:
        pod = r["metric"].get("pod", "")
        svc = pod_to_service(pod)
        if svc:
            restarts[svc] = restarts.get(svc, 0) + float(r["value"][1])
    return restarts

def get_replicas_available():
    results = prom_query_all(
        'kube_deployment_status_replicas_available{namespace="default"}')
    replicas = {}
    for r in results:
        dep = r["metric"].get("deployment", "")
        svc = DEPLOYMENT_MAP.get(dep)
        if svc:
            replicas[svc] = float(r["value"][1])
    return replicas

def get_pod_ready():
    results = prom_query_all(
        'kube_pod_status_ready{namespace="default", condition="true"}')
    ready = {}
    for r in results:
        pod = r["metric"].get("pod", "")
        svc = pod_to_service(pod)
        if svc:
            ready[svc] = float(r["value"][1])
    return ready

def get_pod_waiting():
    results = prom_query_all(
        'kube_pod_container_status_waiting{namespace="default"}')
    waiting = {}
    for r in results:
        pod = r["metric"].get("pod", "")
        svc = pod_to_service(pod)
        if svc:
            waiting[svc] = float(r["value"][1])
    return waiting

def get_metrics(svc, restarts, replicas_avail, pod_ready, pod_waiting):
    available = replicas_avail.get(svc, -1)
    expected = EXPECTED_REPLICAS.get(svc, 1)
    restart_count = restarts.get(svc, 0)
    is_ready = pod_ready.get(svc, 1.0)
    is_waiting = pod_waiting.get(svc, 0.0)

    # Key fix: if available == -1, service has NO pods at all (scaled to 0)
    # if available < expected, replicas are missing
    if available == -1:
        # Service completely down — no pods exist
        replica_gap = expected
        is_ready = 0.0
    else:
        replica_gap = max(0, expected - available)

    # Anomaly signals
    latency = 80.0 + (restart_count * 50) + (replica_gap * 200) + \
              (is_waiting * 150) + ((1 - is_ready) * 400)
    error_rate = 0.001 + (restart_count * 0.03) + (replica_gap * 0.2) + \
                 (is_waiting * 0.15) + ((1 - is_ready) * 0.5)
    cpu = 0.2 + (restart_count * 0.15) + (replica_gap * 0.35) + \
          (is_waiting * 0.3) + random.uniform(-0.02, 0.02)

    return {
        "request_rate": 50.0 + random.uniform(-5, 5),
        "latency_p95": min(latency + random.uniform(-5, 5), 2000.0),
        "error_rate": min(error_rate, 1.0),
        "cpu": min(cpu, 1.0),
        "memory": min(0.4 + (restart_count * 0.05) + random.uniform(-0.02, 0.02), 1.0),
        "restart_count": restart_count,
        "replica_gap": replica_gap,
        "pod_ready": is_ready,
        "pod_waiting": is_waiting,
    }

def get_log_features(svc):
    try:
        params = {
            "query": f'count_over_time({{app="{svc}"}} |= "error" [30s])',
            "start": str(int(time.time()) - 30),
            "end": str(int(time.time())),
        }
        r = requests.get(f"{LOKI}/loki/api/v1/query_range",
                         params=params, timeout=1)
        ec = int(r.json()["data"]["result"][0]["values"][-1][1])
    except Exception:
        ec = 0
    return {
        "error_count": ec,
        "warning_count": 0,
        "error_rate_logs": ec / max(ec + 1, 1)
    }

def collect_all_features(services):
    restarts = get_restart_counts()
    replicas_avail = get_replicas_available()
    pod_ready = get_pod_ready()
    pod_waiting = get_pod_waiting()

    result = []
    for svc in services:
        metrics = get_metrics(svc, restarts, replicas_avail,
                              pod_ready, pod_waiting)
        logs = get_log_features(svc)
        result.append({"name": svc, "metrics": metrics, "log_features": logs})
    return result
