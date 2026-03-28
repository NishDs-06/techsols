def extract_metric_features(metrics):
    """
    Convert metrics object → list of 5 numerical features
    STRICT ORDER — DO NOT CHANGE
    """

    return [
        float(metrics.cpu),
        float(metrics.memory),
        float(metrics.latency_p95),
        float(metrics.error_rate),
        float(metrics.request_rate)
    ]


def extract_log_features(logs):
    """
    Convert log_features object → list of 3 numerical features
    """

    return [
        int(logs.error_count),
        int(logs.warning_count),
        float(logs.error_rate_logs)
    ]