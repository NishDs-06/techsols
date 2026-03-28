
import time
import logging

logger = logging.getLogger(__name__)

NAMESPACE = "default"


def _get_k8s_clients():
    try:
        from kubernetes import client, config
    except ImportError:
        logger.warning("kubernetes package not installed — will simulate")
        return None, None
    try:
        config.load_kube_config()
    except Exception:
        try:
            config.load_incluster_config()
        except Exception:
            return None, None
    return client.AppsV1Api(), client.CoreV1Api()

def scale_up(service_name, delta=2):
    apps_v1, _ = _get_k8s_clients()
    if not apps_v1:
        logger.warning("K8s not available — simulating scale_up")
        return {"action": "scale_up", "service": service_name,
                "from": 1, "to": 1 + delta, "simulated": True}
    dep = apps_v1.read_namespaced_deployment(service_name, NAMESPACE)
    cur = dep.spec.replicas or 0
    dep.spec.replicas = 1
    apps_v1.patch_namespaced_deployment(service_name, NAMESPACE, dep)
    return {"action": "scale_up", "service": service_name,
            "from": cur, "to": 1}

def restart_pod(service_name):
    _, core_v1 = _get_k8s_clients()
    if not core_v1:
        logger.warning("K8s not available — simulating restart_pod")
        return {"action": "restart_pod", "service": service_name, "simulated": True}
    pods = core_v1.list_namespaced_pod(
        NAMESPACE, label_selector=f"app={service_name}")
    if pods.items:
        core_v1.delete_namespaced_pod(
            pods.items[0].metadata.name, NAMESPACE)
    return {"action": "restart_pod", "service": service_name}

def select_action(svc, ml_scores):
    """replica_gap > 0 or CPU > 80% → scale_up. Otherwise → restart_pod."""
    metrics = ml_scores.get(svc, {}).get("metrics", {})
    cpu = metrics.get("cpu", 0)
    replica_gap = metrics.get("replica_gap", 0)
    if replica_gap > 0 or cpu > 0.80:
        return "scale_up"
    return "restart_pod"

ACTION_MAP = {"scale_up": scale_up, "restart_pod": restart_pod}

def remediate(svc, ml_scores):
    action = select_action(svc, ml_scores)
    result = ACTION_MAP[action](svc)
    result["ts"] = time.time()
    return result