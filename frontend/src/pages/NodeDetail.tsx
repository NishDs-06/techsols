import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { SERVICE_EDGES } from '../data/serviceGraph';
import LatencySparkline from '../components/charts/LatencySparkline';
import { cn } from '../utils/cn';

export default function NodeDetail() {
  const { service } = useParams();
  const navigate = useNavigate();
  const services = useStore((s) => s.services);
  const incident = useStore((s) => s.incident);

  const node = services.find((s) => s.name === service);

  if (!node) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-mono text-[14px] text-muted">Service not found.</span>
      </div>
    );
  }

  const upstream = SERVICE_EDGES.filter((e) => e.target === service).map((e) => e.source);
  const downstream = SERVICE_EDGES.filter((e) => e.source === service).map((e) => e.target);
  const isIncident = incident && incident.root_service === service;

  const connections = Array.from({ length: 8 }).map((_, i) => ({
    time: new Date(Date.now() - Math.random() * 30000).toISOString(),
    peer: downstream.length > 0 ? downstream[i % downstream.length] : upstream[i % upstream.length] || 'unknown',
    latency: Math.round(20 + Math.random() * 10 * (isIncident ? 10 : 1)),
    status: Math.random() > (isIncident ? 0.3 : 0.01) ? 200 : 503,
  })).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const metadata = [
    { label: 'Status', value: node.status },
    { label: 'Confidence', value: node.anomaly_confidence.toFixed(2) },
    { label: 'IP', value: `10.96.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` },
    { label: 'Namespace', value: 'default' },
    { label: 'Replicas', value: node.status === 'root' ? '3' : '1' },
    { label: 'Last incident', value: isIncident ? new Date(incident.injected_at).toLocaleString() : 'Never' },
    { label: 'Upstream', value: upstream.join(', ') || '(none)' },
    { label: 'Downstream', value: downstream.join(', ') || '(leaf — none)' },
  ];

  return (
    <div className="w-full h-full flex overflow-hidden bg-base">
      {/* LEFT — Metadata */}
      <div className="w-1/2 h-full border-r border-border p-10 overflow-y-auto custom-scrollbar">
        <button onClick={() => navigate(-1)} className="font-mono text-[11px] text-muted hover:text-primary tracking-[0.1em] uppercase mb-10 transition-colors">
          ← Back
        </button>

        <div className="mb-8">
          <div className="font-sora text-[24px] text-primary font-semibold tracking-wide mb-3">{node.name}</div>
          <div
            className="inline-flex items-center px-3 py-1 rounded-sm font-sora text-[12px] font-medium tracking-wide uppercase border"
            style={{
              color: `var(--status-${node.status})`,
              borderColor: `var(--status-${node.status})`,
              backgroundColor: 'transparent',
            }}
          >
            {node.status}
          </div>
        </div>

        <div className="flex flex-col">
          {metadata.map((row, i) => (
            <div key={i} className="flex border-b border-border py-4">
              <div className="w-[120px] shrink-0 font-mono text-[12px] text-muted tracking-tight">{row.label}</div>
              <div className="flex-1 font-mono text-[12px] text-primary">{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Charts + Connections */}
      <div className="w-1/2 h-full flex flex-col overflow-hidden">
        <div className="h-[280px] shrink-0 border-b border-border">
          <LatencySparkline serviceName={node.name} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-5 pb-3">
            <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">Recent Connections</span>
          </div>
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_80px_60px] gap-4 px-6 py-2">
            <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">Time</span>
            <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">Peer</span>
            <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase text-right">Latency</span>
            <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase text-right">Status</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {connections.map((conn, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_80px_60px] gap-4 px-6 py-3 hover:bg-elevated transition-colors">
                <span className="font-mono text-[12px] text-muted truncate">{new Date(conn.time).toLocaleTimeString()}</span>
                <span className="font-mono text-[12px] text-primary">{conn.peer}</span>
                <span className={cn('font-mono text-[12px] text-right tabular-nums', conn.latency > 150 ? 'text-status-warning' : 'text-muted')}>
                  {conn.latency}ms
                </span>
                <span className={cn('font-mono text-[12px] text-right tabular-nums', conn.status === 200 ? 'text-status-recovered' : 'text-status-root')}>
                  {conn.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
