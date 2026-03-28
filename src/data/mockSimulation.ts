import { useStore } from '../store/useStore';
import { SERVICES, SERVICE_EDGES } from './serviceGraph';
import type { ServiceState, IncidentMessage, ServiceStatus } from './types';

let stateInterval: ReturnType<typeof setInterval> | null = null;
let bandwidthInterval: ReturnType<typeof setInterval> | null = null;
let anomalyTimeout: ReturnType<typeof setTimeout> | null = null;
let isAnomalyActive = false;
let anomalyCount = 0;

let currentServices: ServiceState[] = SERVICES.map((name) => ({
  name,
  anomaly_confidence: Math.random() * 0.1,
  status: 'normal' as ServiceStatus,
  latency_p95: 20 + Math.random() * 40,
}));

const getStatus = (c: number): ServiceStatus => {
  if (c >= 0.95) return 'root';
  if (c >= 0.80) return 'critical';
  if (c >= 0.50) return 'warning';
  return 'normal';
};

const getUpstream = (service: string): string[] =>
  SERVICE_EDGES.filter((e) => e.target === service).map((e) => e.source);

const simulateBandwidth = () => {
  let baseIn = 2.2 + (Math.random() * 0.6 - 0.3);
  let baseOut = 0.9 + (Math.random() * 0.2 - 0.1);
  if (isAnomalyActive) {
    baseIn *= 0.7;
    baseOut *= 0.7;
  }
  useStore.getState().addBandwidthData({
    time: new Date().toISOString(),
    in: baseIn,
    out: baseOut,
  });
};

const updateState = () => {
  if (!isAnomalyActive) {
    currentServices = currentServices.map((s) => {
      const drift = (Math.random() - 0.5) * 0.05;
      const conf = Math.max(0, Math.min(0.4, s.anomaly_confidence + drift));
      return { ...s, anomaly_confidence: conf, status: getStatus(conf), latency_p95: 20 + conf * 100 };
    });
  }
  useStore.getState().setServices([...currentServices]);
};

function triggerAnomaly() {
  isAnomalyActive = true;
  anomalyCount++;
  const rootService = anomalyCount % 2 === 1 ? 'paymentservice' : 'checkoutservice';
  const incidentId = `inc-${new Date().toISOString()}`;
  const injectedAt = new Date().toISOString();

  // Spike root
  currentServices = currentServices.map((s) => {
    if (s.name === rootService) return { ...s, anomaly_confidence: 0.97, status: 'root' as ServiceStatus, latency_p95: 260 };
    return s;
  });
  updateState();

  // Cascade after 2s
  setTimeout(() => {
    const up1 = getUpstream(rootService);
    const up2 = up1.flatMap(getUpstream);
    const affected = new Set([rootService, ...up1, ...up2]);
    currentServices = currentServices.map((s) => {
      if (s.name !== rootService && affected.has(s.name)) {
        return { ...s, anomaly_confidence: 0.6 + Math.random() * 0.2, status: 'warning' as ServiceStatus, latency_p95: 150 };
      }
      return s;
    });
    updateState();
  }, 2000);

  // Incident message after 5s (detection + RCA)
  setTimeout(() => {
    let path = [rootService];
    if (rootService === 'paymentservice') {
      path = ['frontend', 'cartservice', 'checkoutservice', 'paymentservice'];
    } else {
      path = ['frontend', 'checkoutservice'];
    }
    const incident: IncidentMessage = {
      type: 'incident',
      incident_id: incidentId,
      injected_at: injectedAt,
      detected_at: new Date(new Date(injectedAt).getTime() + 3000).toISOString(),
      rca_completed_at: new Date().toISOString(),
      remediation_started_at: new Date(Date.now() + 1000).toISOString(),
      recovered_at: null,
      root_service: rootService,
      rca_score: 0.82,
      anomaly_confidence: 0.97,
      affected_services: path,
      paths: [path],
      metrics: {
        [rootService]: {
          latency_p95: { current: 260.0, baseline: 80.0 },
          error_rate: { current: 0.03, baseline: 0.004 },
          cpu: { current: 0.88, baseline: 0.45 },
        },
      },
      applied_action: 'scale_up',
      remediation_detail: `Scaled ${rootService} from 1 to 3 replicas`,
      sla_seconds: 15,
      actual_seconds: null,
    };
    useStore.getState().setIncident(incident);
    useStore.getState().addAlert({
      id: incidentId,
      severity: 'critical',
      timestamp: injectedAt,
      service: rootService,
      description: `Anomaly detected. RCA identified ${rootService} as root cause. Confidence: 0.97`,
      confidence: 0.97,
      p_value: 0.001,
      resolved: false,
    });
  }, 5000);

  // Transition to recovering at 10s
  setTimeout(() => {
    currentServices = currentServices.map((s) => {
      if (s.status === 'root' || s.status === 'critical') {
        return { ...s, anomaly_confidence: 0.6, status: 'recovering' as ServiceStatus, latency_p95: 120 };
      }
      if (s.status === 'warning') {
        return { ...s, anomaly_confidence: 0.35, status: 'normal' as ServiceStatus, latency_p95: 60 };
      }
      return s;
    });
    updateState();
  }, 10000);

  // Recovery after 14s
  setTimeout(() => {
    isAnomalyActive = false;
    const store = useStore.getState();
    if (store.incident) {
      store.setIncident({ ...store.incident, recovered_at: new Date().toISOString(), actual_seconds: 14.2 });
    }
    currentServices = currentServices.map((s) => {
      if (s.status === 'recovering' || s.status === 'root' || s.status === 'critical' || s.status === 'warning') {
        return { ...s, anomaly_confidence: 0.1, status: 'recovered' as ServiceStatus, latency_p95: 40 };
      }
      return s;
    });
    updateState();

    // Add recovery alert
    store.addAlert({
      id: `recovery-${Date.now()}`,
      severity: 'info',
      timestamp: new Date().toISOString(),
      service: store.incident?.root_service || 'unknown',
      description: `Incident resolved. Remediation successful. SLA: 14.2s ✓`,
      confidence: 0.05,
      p_value: 0.9,
      resolved: true,
    });

    setTimeout(() => {
      currentServices = currentServices.map((s) =>
        s.status === 'recovered' ? { ...s, status: 'normal' as ServiceStatus } : s
      );
      updateState();
      scheduleNextAnomaly();
    }, 6000);
  }, 14200);
}

function scheduleNextAnomaly() {
  if (anomalyTimeout) clearTimeout(anomalyTimeout);
  // First anomaly comes fast (18s), subsequent ones every 50-70s
  const delay = anomalyCount === 0 ? 18000 : 50000 + Math.random() * 20000;
  anomalyTimeout = setTimeout(triggerAnomaly, delay);
}

export const startSimulation = () => {
  if (!stateInterval) {
    stateInterval = setInterval(updateState, 5000);
    bandwidthInterval = setInterval(simulateBandwidth, 2000);
    scheduleNextAnomaly();
    updateState();
    simulateBandwidth();
  }
};

export const stopSimulation = () => {
  if (stateInterval) clearInterval(stateInterval);
  if (bandwidthInterval) clearInterval(bandwidthInterval);
  if (anomalyTimeout) clearTimeout(anomalyTimeout);
  stateInterval = null;
  bandwidthInterval = null;
  anomalyTimeout = null;
};
