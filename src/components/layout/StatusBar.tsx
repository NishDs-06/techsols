import { useStore } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { useState, useEffect } from 'react';

export default function StatusBar() {
  const services = useStore((s) => s.services);
  const incident = useStore((s) => s.incident);
  const bandwidthData = useStore((s) => s.bandwidthData);
  const [elapsed, setElapsed] = useState(0);
  const [clock, setClock] = useState(new Date());

  const onlineCount = services.filter((s) => s.status !== 'root' && s.status !== 'critical').length;
  const totalCount = services.length || 10;
  const hasActiveIncident = incident && !incident.recovered_at;
  const anyWarning = services.some((s) => ['warning', 'critical', 'root'].includes(s.status));

  const latest = bandwidthData[bandwidthData.length - 1] || { in: 0, out: 0 };

  useEffect(() => {
    if (!hasActiveIncident || !incident) return;
    const start = new Date(incident.injected_at).getTime();
    const tick = () => setElapsed((Date.now() - start) / 1000);
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [hasActiveIncident, incident]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full h-[44px] px-8 flex items-center justify-between border-b border-border bg-base select-none">
      <div className="flex items-center gap-8">
        <span className="font-sora text-[14px] font-bold tracking-[0.18em] text-primary uppercase">SENTINEL</span>
        <div className="w-[1px] h-[16px] bg-border" />
        <div className="flex items-center gap-[14px]">
          <div
            className={cn(
              'w-2 h-2 rounded-full transition-colors duration-500',
              hasActiveIncident ? 'bg-status-root animate-pulse-dot' : anyWarning ? 'bg-status-warning' : 'bg-accent'
            )}
          />
          <span className="font-mono text-[12px] font-medium tabular-nums text-muted">
            {onlineCount}/{totalCount} online
          </span>
        </div>
        <div className="flex items-center gap-5 font-mono text-[12px] font-medium tabular-nums text-primary">
          <span>↑ {latest.out.toFixed(1)} GB/s</span>
          <span>↓ {latest.in.toFixed(1)} GB/s</span>
        </div>
      </div>

      <div className="flex items-center gap-6 font-mono text-[12px] font-medium">
        <span className="text-muted tabular-nums uppercase tracking-[0.14em]" style={{ fontSize: '10px' }}>
          last anomaly:{' '}
          {hasActiveIncident ? (
            <span className="text-status-root font-semibold tracking-wide lowercase">ACTIVE</span>
          ) : (
            <span className="lowercase">4m ago</span>
          )}
        </span>

        {hasActiveIncident ? (
          <span
            className="font-semibold tabular-nums"
            style={{ color: elapsed <= 15 ? 'var(--status-warning)' : 'var(--accent-breach)' }}
          >
            SLA: {elapsed.toFixed(1)}s / 15s
          </span>
        ) : incident?.actual_seconds ? (
          <span className="text-accent tabular-nums">SLA: {incident.actual_seconds}s ✓</span>
        ) : (
          <span className="text-accent tabular-nums">SLA: 14.2s ✓</span>
        )}

        <div className="w-[1px] h-[14px] bg-border" />

        <span className="text-muted tabular-nums text-[11px] tracking-[0.06em]">
          {clock.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
