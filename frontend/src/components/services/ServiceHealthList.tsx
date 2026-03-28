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
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">Service Health</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col">
          {sorted.map((svc) => {
            const isCritical = ['root', 'critical'].includes(svc.status);
            
            let rowBg = 'transparent';
            if (svc.status === 'root') rowBg = 'rgba(220,38,38,0.04)';
            if (svc.status === 'warning') rowBg = 'rgba(245,158,11,0.03)';

            let confColor = 'var(--text-muted)';
            if (svc.anomaly_confidence > 0.8) confColor = 'var(--status-root)';
            else if (svc.anomaly_confidence > 0.5) confColor = 'var(--status-warning)';

            let latColor = 'var(--text-muted)';
            let latWeight = 'normal';
            if (svc.latency_p95 > 200) { latColor = 'var(--status-root)'; latWeight = '500'; }
            else if (svc.latency_p95 > 100) latColor = 'var(--status-warning)';

            return (
              <div
                key={svc.name}
                onClick={() => navigate(`/node/${svc.name}`)}
                className="flex items-center gap-4 px-6 py-[14px] cursor-pointer transition-colors duration-150 hover:bg-elevated border-l-[3px] border-transparent"
                style={{ borderLeftColor: isCritical ? `var(--status-${svc.status})` : 'transparent', backgroundColor: rowBg }}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0 transition-colors duration-500',
                    isCritical && 'animate-pulse-dot'
                  )}
                  style={{ backgroundColor: `var(--status-${svc.status})` }}
                />
                <span className="font-sora text-[13px] font-medium text-primary flex-1 tracking-[0.04em] capitalize">{svc.name}</span>
                <span className="font-mono text-[11px] tabular-nums w-[40px] text-right font-medium" style={{ color: confColor }}>
                  {(svc.anomaly_confidence * 100).toFixed(0)}%
                </span>
                <span className="font-mono text-[12px] tabular-nums w-[52px] text-right" style={{ color: latColor, fontWeight: latWeight }}>
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
