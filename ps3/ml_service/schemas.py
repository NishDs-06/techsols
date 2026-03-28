# schemas.py

from pydantic import BaseModel
from typing import List

class Metrics(BaseModel):
    cpu: float
    memory: float
    latency_p95: float
    error_rate: float
    request_rate: float

class LogFeatures(BaseModel):
    error_count: int
    warning_count: int
    error_rate_logs: float

class ServiceInput(BaseModel):
    name: str
    metrics: Metrics
    log_features: LogFeatures

class PredictRequest(BaseModel):
    timestamp: str
    services: List[ServiceInput]