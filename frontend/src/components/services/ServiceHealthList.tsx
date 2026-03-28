import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/cn';

export default function ServiceHealthList() {
  const services = useStore((s) => s.services);
  const navigate = useNavigate();

  const statusOrder: Record<string, number> = { root: 0, critical: 1, warning: 2, recovering: 3, recovered: 4, normal: 5 };
  const sorted = [...services].sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 pt-5 pb-3">
        <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">Service Health</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col">
          {sorted.map((svc) => {
            const isCritical = ['root', 'critical'].includes(svc.status);
            return (
              <div
                key={svc.name}
                onClick={() => navigate(`/node/${svc.name}`)}
                className="flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors duration-150 hover:bg-elevated border-l-[3px] border-transparent"
                style={{ borderLeftColor: isCritical ? `var(--status-${svc.status})` : 'transparent' }}
              >
                <div
                  className={cn('w-2 h-2 rounded-full shrink-0 transition-colors duration-500', isCritical && 'animate-pulse-dot')}
                  style={{ backgroundColor: `var(--status-${svc.status})` }}
                />
                <span className="font-sora text-[13px] text-primary flex-1 tracking-wide">{svc.name}</span>
                <span className="font-mono text-[12px] text-muted tabular-nums w-[48px] text-right">
                  {(svc.anomaly_confidence * 100).toFixed(0)}%
                </span>
                <span className={cn('font-mono text-[12px] tabular-nums w-[56px] text-right', svc.latency_p95 > 150 ? 'text-status-warning' : 'text-muted')}>
                  {svc.latency_p95.toFixed(0)}ms
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
