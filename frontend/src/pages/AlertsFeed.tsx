import { useState } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

type Filter = 'all' | 'critical' | 'warning' | 'info';

export default function AlertsFeed() {
  const alerts = useStore((s) => s.alerts);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);

  const borderColors: Record<string, string> = {
    critical: 'var(--status-root)',
    warning: 'var(--status-warning)',
    info: 'var(--status-recovering)',
  };

  const filters: Filter[] = ['all', 'critical', 'warning', 'info'];

  return (
    <div className="w-full h-full flex flex-col bg-base overflow-hidden">
      {/* Filter bar */}
      <div className="px-8 pt-6 pb-4 flex items-center gap-3 shrink-0">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'font-mono text-[12px] px-4 py-1.5 rounded-sm border transition-colors tracking-wide uppercase',
              filter === f ? 'bg-accent text-base border-accent font-semibold' : 'bg-transparent text-muted border-border hover:text-primary hover:border-primary/30'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
        <div className="flex flex-col gap-3">
          {filtered.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.15, delay: i * 0.03, ease: 'easeOut' }}
              className={cn('border border-border rounded-sm p-5 transition-opacity', alert.resolved && 'opacity-40')}
              style={{ borderLeftWidth: '4px', borderLeftColor: borderColors[alert.severity] }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[12px] text-muted">{new Date(alert.timestamp).toLocaleString()}</span>
                <span className="font-sora text-[13px] text-primary font-medium tracking-wide">{alert.service}</span>
              </div>
              <div className="font-sora text-[13px] text-primary mb-2 leading-relaxed">{alert.description}</div>
              <div className="font-mono text-[11px] text-muted">
                confidence {alert.confidence.toFixed(2)} · p_value {alert.p_value.toFixed(3)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
