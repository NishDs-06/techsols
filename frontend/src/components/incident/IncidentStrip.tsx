import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function IncidentStrip() {
  const incident = useStore((s) => s.incident);
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  const isActive = incident && !incident.recovered_at;

  // ADDED: Phase detection — same logic as SLATimer
  const hasRemediation = incident?.remediation_started_at != null;
  const isPhase1 = isActive && !hasRemediation;
  const isPhase2 = isActive && hasRemediation;

  useEffect(() => {
    if (!isActive || !incident) return;
    const start = new Date(incident.injected_at).getTime();

    const tick = () => {
      setElapsed((Date.now() - start) / 1000);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [isActive, incident]);

  if (!isActive || !incident) return null;

  const slaDisplay = incident.actual_seconds !== null
    ? `${incident.actual_seconds}s`
    : `${elapsed.toFixed(1)}s`;
  const slaColor = elapsed <= 15 ? 'var(--accent)' : 'var(--accent-breach)';

  // CHANGED: Phase-aware border and accent color
  const stripBorderColor = isPhase2 ? '#22C55E' : 'var(--status-root)';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={() => navigate(`/incident/${incident.incident_id}`)}
          className="w-full shrink-0 bg-surface border-t-2 px-8 py-3.5 flex items-center gap-6 cursor-pointer select-none hover:bg-elevated transition-colors"
          style={{ borderTopColor: stripBorderColor }}
        >
          {/* CHANGED: Phase-aware status badge */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse-dot"
              style={{ backgroundColor: isPhase2 ? '#22C55E' : 'var(--status-root)' }}
            />
            <span
              className="font-sora text-[11px] font-semibold tracking-wide"
              style={{ color: isPhase2 ? '#22C55E' : 'var(--status-root)' }}
            >
              {isPhase1 ? 'DETECTING · RCA IN PROGRESS' : 'RCA COMPLETE · STABILIZING'}
            </span>
          </div>
          <span className="font-mono text-[12px] text-primary font-medium">{incident.root_service}</span>

          <div className="w-[1px] h-4 bg-border" />

          <span className="font-mono text-[11px] text-muted">
            confidence: <span className="text-primary font-medium">{(incident.anomaly_confidence * 100).toFixed(0)}%</span>
          </span>

          <div className="w-[1px] h-4 bg-border" />

          <span className="font-mono text-[11px] text-muted">
            action: <span className="text-primary">{incident.applied_action}</span> → {incident.remediation_detail?.split(' ').slice(-2).join(' ') ?? ''}
          </span>

          <div className="w-[1px] h-4 bg-border" />

          {/* Affected path */}
          <span className="font-mono text-[11px] text-muted hidden xl:inline">
            {incident.affected_services.join(' → ')}
          </span>

          {/* Live SLA counter — right aligned */}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">SLA</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-[5px] h-[5px] rounded-full animate-pulse-dot"
                  style={{ backgroundColor: slaColor }}
                />
                <span
                  className="font-mono text-[16px] font-bold tabular-nums tracking-tight"
                  style={{ color: slaColor }}
                >
                  {slaDisplay}
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted">/ 15s</span>
            </div>

            {/* Mini progress bar */}
            <div className="w-[80px] h-[5px] bg-elevated rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-150"
                style={{
                  width: `${Math.min((elapsed / 15) * 100, 100)}%`,
                  backgroundColor: slaColor,
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
