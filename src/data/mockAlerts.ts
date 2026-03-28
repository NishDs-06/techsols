import type { Alert } from './types';

const now = Date.now();
const h = (hoursAgo: number) => new Date(now - hoursAgo * 3600000).toISOString();

export const mockAlerts: Alert[] = [
  { id: 'a1', severity: 'critical', timestamp: h(0.5), service: 'paymentservice', description: 'Anomaly detected: latency_p95 spike to 260ms, Isolation Forest score 0.97', confidence: 0.97, p_value: 0.001, resolved: true },
  { id: 'a2', severity: 'critical', timestamp: h(4), service: 'checkoutservice', description: 'Anomaly detected: error_rate surge to 3.1%, correlation with upstream timeout', confidence: 0.93, p_value: 0.004, resolved: true },
  { id: 'a3', severity: 'warning', timestamp: h(1), service: 'cartservice', description: 'Elevated anomaly confidence: 0.62, monitoring cascade from checkoutservice', confidence: 0.62, p_value: 0.03, resolved: true },
  { id: 'a4', severity: 'warning', timestamp: h(3), service: 'currencyservice', description: 'CPU utilization trending above baseline: 72% vs 45% expected', confidence: 0.55, p_value: 0.04, resolved: false },
  { id: 'a5', severity: 'warning', timestamp: h(6), service: 'shippingservice', description: 'Memory pressure detected: RSS 89% of pod limit', confidence: 0.51, p_value: 0.05, resolved: true },
  { id: 'a6', severity: 'warning', timestamp: h(8), service: 'frontend', description: 'Latency p99 elevated: 180ms vs 95ms baseline', confidence: 0.58, p_value: 0.03, resolved: true },
  { id: 'a7', severity: 'info', timestamp: h(2), service: 'emailservice', description: 'Pod restart completed: liveness probe recovered after 2 failures', confidence: 0.15, p_value: 0.4, resolved: true },
  { id: 'a8', severity: 'info', timestamp: h(5), service: 'adservice', description: 'Horizontal pod autoscaler triggered: 1 → 2 replicas', confidence: 0.12, p_value: 0.5, resolved: true },
  { id: 'a9', severity: 'info', timestamp: h(7), service: 'productcatalog', description: 'Rolling update deployed: image sha256:a3f8..replaced', confidence: 0.08, p_value: 0.7, resolved: true },
  { id: 'a10', severity: 'info', timestamp: h(10), service: 'recommendservice', description: 'Cache invalidation event: model weights reloaded', confidence: 0.10, p_value: 0.6, resolved: true },
  { id: 'a11', severity: 'info', timestamp: h(14), service: 'currencyservice', description: 'Config reload: exchange rate update from external feed', confidence: 0.05, p_value: 0.8, resolved: true },
  { id: 'a12', severity: 'info', timestamp: h(18), service: 'cartservice', description: 'Connection pool scaled: 50 → 75 max connections', confidence: 0.07, p_value: 0.7, resolved: true },
];
