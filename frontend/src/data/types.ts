export type ServiceStatus = 'normal' | 'warning' | 'critical' | 'root' | 'recovering' | 'recovered';

export interface ServiceState {
  name: string;
  anomaly_confidence: number;
  status: ServiceStatus;
  latency_p95: number;
}

export interface MetricDelta {
  current: number;
  baseline: number;
}

export interface IncidentMessage {
  type: 'incident';
  incident_id: string;
  injected_at: string;
  detected_at: string;
  rca_completed_at: string;
  remediation_started_at: string;
  recovered_at: string | null;
  root_service: string;
  rca_score: number;
  anomaly_confidence: number;
  affected_services: string[];
  paths: string[][];
  metrics: Record<string, Record<string, MetricDelta>>;
  applied_action: string;
  remediation_detail: string;
  sla_seconds: number;
  actual_seconds: number | null;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  service: string;
  description: string;
  confidence: number;
  p_value: number;
  resolved: boolean;
}
