import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function IncidentDetail() {
  const navigate = useNavigate();
  const incident = useStore((s) => s.incident);

  if (!incident) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="font-mono text-[14px] text-muted">No active incident.</span>
      </div>
    );
  }

  const baseTime = new Date(incident.injected_at).getTime();
  const timeDelta = (iso: string | null) => {
    if (!iso) return '—';
    return `T+${((new Date(iso).getTime() - baseTime) / 1000).toFixed(0)}s`;
  };

  const timeline = [
    { time: incident.injected_at, delta: 'T+0s', label: 'Failure injected', color: 'var(--text-muted)' },
    { time: incident.detected_at, delta: timeDelta(incident.detected_at), label: 'ML anomaly detected', color: 'var(--status-warning)' },
    { time: incident.rca_completed_at, delta: timeDelta(incident.rca_completed_at), label: `Root cause identified: ${incident.root_service}`, color: 'var(--status-root)' },
    { time: incident.remediation_started_at, delta: timeDelta(incident.remediation_started_at), label: `Action: ${incident.applied_action} fired`, color: 'var(--status-recovering)' },
    ...(incident.recovered_at
      ? [{ time: incident.recovered_at, delta: timeDelta(incident.recovered_at), label: 'Service recovered', color: 'var(--status-recovered)' }]
      : []),
  ];

  const rootMetrics = incident.metrics[incident.root_service] || {};

  const pctChange = (current: number, baseline: number) => {
    const pct = ((current - baseline) / baseline) * 100;
    return `+${pct.toFixed(0)}%`;
  };

  const slaPass = incident.actual_seconds !== null && incident.actual_seconds <= incident.sla_seconds;

  return (
    <div className="w-full h-full flex overflow-hidden bg-base">
      {/* LEFT — Timeline */}
      <div className="w-1/2 h-full border-r border-border p-10 overflow-y-auto custom-scrollbar">
        <button onClick={() => navigate(-1)} className="font-mono text-[11px] text-muted hover:text-primary tracking-[0.1em] uppercase mb-10 transition-colors">
          ← Back
        </button>

        {/* SLA Badge */}
        <div className="mb-12">
          <div className={`font-mono text-[48px] font-bold tracking-tight leading-none ${slaPass ? 'text-accent' : 'text-accent-breach'}`}>
            {incident.actual_seconds ?? '—'}s
          </div>
          <div className={`font-sora text-[14px] mt-2 tracking-wide ${slaPass ? 'text-accent' : 'text-accent-breach'}`}>
            {slaPass ? `Within ${incident.sla_seconds}s SLA` : 'SLA BREACHED'}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-col">
          {timeline.map((step, i) => (
            <div key={i} className="flex gap-6 relative">
              {/* Vertical line */}
              {i < timeline.length - 1 && (
                <div className="absolute left-[5px] top-[16px] w-[1px] h-[calc(100%)] bg-border" />
              )}
              {/* Dot */}
              <div className="relative z-10 shrink-0 mt-[6px]">
                <div className="w-[10px] h-[10px] rounded-full border-2" style={{ borderColor: step.color, backgroundColor: 'var(--bg-base)' }} />
              </div>
              {/* Content */}
              <div className="pb-8">
                <div className="font-mono text-[12px] text-muted mb-1">{step.delta} · {new Date(step.time).toLocaleTimeString()}</div>
                <div className="font-sora text-[14px] tracking-wide" style={{ color: step.color }}>{step.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Evidence */}
      <div className="w-1/2 h-full p-10 overflow-y-auto custom-scrollbar">
        <div className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase mb-8">Evidence · {incident.root_service}</div>

        {/* Metric Deltas */}
        <div className="flex flex-col gap-8">
          {Object.entries(rootMetrics).map(([key, val]) => {
            const formatVal = (v: number) => {
              if (key === 'error_rate') return `${(v * 100).toFixed(1)}%`;
              if (key === 'cpu') return `${(v * 100).toFixed(0)}%`;
              return `${v.toFixed(0)}ms`;
            };
            const barPct = Math.min(100, (val.current / (val.baseline * 4)) * 100);
            const basePct = Math.min(100, (val.baseline / (val.baseline * 4)) * 100);

            return (
              <div key={key} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-sora text-[13px] text-primary tracking-wide">{key.replace('_', ' ')}</span>
                  <span className="font-mono text-[13px] text-status-root font-semibold">{pctChange(val.current, val.baseline)}</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[20px] text-status-root font-bold">{formatVal(val.current)}</span>
                  <span className="font-mono text-[12px] text-muted">baseline: {formatVal(val.baseline)}</span>
                </div>
                {/* Bar */}
                <div className="w-full h-[6px] bg-elevated rounded-sm overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 bg-border rounded-sm" style={{ width: `${basePct}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${barPct}%`, backgroundColor: 'var(--status-root)', opacity: 0.8 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Affected Path */}
        <div className="mt-12">
          <div className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase mb-4">Affected Path</div>
          <div className="flex items-center gap-3 flex-wrap">
            {incident.affected_services.map((svc, i) => {
              const isRoot = svc === incident.root_service;
              return (
                <div key={svc} className="flex items-center gap-3">
                  <span
                    className={`font-mono text-[13px] px-3 py-1.5 rounded-sm ${isRoot ? 'bg-status-root/10 text-status-root border border-status-root/30 font-semibold' : 'text-muted'}`}
                  >
                    {svc}
                  </span>
                  {i < incident.affected_services.length - 1 && <span className="font-mono text-[12px] text-border">→</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Remediation Detail */}
        <div className="mt-10 p-5 border border-border rounded-sm bg-surface">
          <div className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase mb-2">Remediation</div>
          <div className="font-mono text-[13px] text-primary">{incident.remediation_detail}</div>
        </div>
      </div>
    </div>
  );
}
