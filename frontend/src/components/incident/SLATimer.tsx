import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { motion } from 'framer-motion';

const SLA_TARGET = 15;

/**
 * Two-Phase SLA Timer:
 *  Phase 1 (Analysis):    detected_at → remediation_started_at  — red pulsing, timer counting
 *  Phase 2 (Stabilizing): remediation_started_at → recovered_at — green orbiting ring, timer frozen
 *  Phase 3 (Recovered):   recovered_at set                     — green checkmark, final time
 */
export default function SLATimer() {
  const incident = useStore((s) => s.incident);
  const setRecoveryToast = useStore((s) => s.setRecoveryToast);
  const [elapsed, setElapsed] = useState<number>(0);
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const toastFiredRef = useRef<string | null>(null); // track which incident we already toasted

  const isActive = incident && !incident.recovered_at;
  const isResolved = incident && incident.recovered_at !== null;

  // CHANGED: Determine which phase we're in
  const hasRemediation = incident?.remediation_started_at != null;
  const isPhase1 = isActive && !hasRemediation; // Analysis in progress
  const isPhase2 = isActive && hasRemediation;   // Stabilizing (waiting for pod restart)

  // Compute analysis duration (Phase 1 time)
  useEffect(() => {
    if (incident?.remediation_started_at && incident?.detected_at) {
      const det = new Date(incident.detected_at).getTime();
      const rem = new Date(incident.remediation_started_at).getTime();
      setAnalysisTime(Math.max(0, (rem - det) / 1000));
    } else {
      setAnalysisTime(null);
    }
  }, [incident?.remediation_started_at, incident?.detected_at]);

  useEffect(() => {
    if (isActive && incident) {
      const injectedTime = new Date(incident.injected_at).getTime();
      startRef.current = injectedTime;

      const tick = () => {
        if (!startRef.current) return;
        const now = Date.now();
        const secs = (now - startRef.current) / 1000;
        setElapsed(secs);
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);

      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    } else if (isResolved && incident?.actual_seconds) {
      setElapsed(incident.actual_seconds);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      // ADDED: Fire recovery toast on Phase 3 transition (only once per incident)
      if (toastFiredRef.current !== incident.incident_id) {
        toastFiredRef.current = incident.incident_id;
        setRecoveryToast({
          message: `✓ Pod restarted successfully · Incident resolved in ${incident.actual_seconds}s`,
          resolvedAt: incident.recovered_at!,
          actualSeconds: incident.actual_seconds,
        });
      }
    } else {
      setElapsed(0);
      startRef.current = null;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }
  }, [isActive, isResolved, incident, setRecoveryToast]);

  // Display values
  const displaySeconds = isResolved && incident?.actual_seconds
    ? incident.actual_seconds
    : elapsed;
  const isBreach = displaySeconds > SLA_TARGET;
  const isPass = isResolved && !isBreach;

  // CHANGED: Phase-aware colors
  const progressColor = !incident
    ? 'var(--text-muted)'
    : isBreach
      ? 'var(--accent-breach)'
      : isPass
        ? 'var(--accent)'
        : isPhase2
          ? '#22C55E' // green for stabilizing phase
          : displaySeconds > 12
            ? 'var(--status-warning)'
            : 'var(--accent)';

  // CHANGED: Phase 1 shows analysis time in center, Phase 2 shows total elapsed
  const centerDisplay = isPhase2 && analysisTime !== null
    ? `${analysisTime.toFixed(0)}s`
    : `${Math.floor(displaySeconds)}s`;

  return (
    <div className="flex flex-col items-center select-none gap-[6px]">
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-[4px] shrink-0">
        <span className="font-mono text-[9px] tracking-[0.06em] text-muted uppercase whitespace-nowrap">SLA Timer</span>
        <span className="font-mono text-[9px] tracking-[0.06em] text-muted uppercase whitespace-nowrap">Target 15s</span>
      </div>

      {/* SVG Container */}
      <div className="relative flex items-center justify-center w-[140px] h-[140px] shrink-0">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="absolute inset-0"
        >
          {/* ADDED: CSS for green orbiting ring animation */}
          <style>{`
            @keyframes orbit {
              to { transform: rotate(360deg); }
            }
            .orbit-ring {
              animation: orbit 2s linear infinite;
              transform-origin: 70px 70px;
            }
          `}</style>

          {/* Dots */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
            const x = 70 + 58 * Math.cos(angle);
            const y = 70 + 58 * Math.sin(angle);
            const isLit = i < Math.ceil((Math.min(displaySeconds, 15) / 15) * 12);

            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={isLit ? 3.5 : 2.5}
                fill={isLit ? progressColor : 'var(--border)'}
                style={{
                  transition: 'fill 400ms ease, r 150ms ease, filter 200ms ease',
                  filter: isActive && isLit ? `drop-shadow(0 0 5px ${progressColor})` : 'none'
                }}
              />
            );
          })}

          {/* ADDED: Green orbiting ring for Phase 2 (Stabilizing) */}
          {isPhase2 && (
            <g className="orbit-ring">
              <circle
                cx={70 + 48 * Math.cos(-Math.PI / 2)}
                cy={70 + 48 * Math.sin(-Math.PI / 2)}
                r={5}
                fill="#22C55E"
                opacity={0.9}
              />
              <circle
                cx={70 + 48 * Math.cos(-Math.PI / 2)}
                cy={70 + 48 * Math.sin(-Math.PI / 2)}
                r={8}
                fill="#22C55E"
                opacity={0.2}
              />
            </g>
          )}
        </svg>

        {/* Center content overlay */}
        <div className="flex flex-col items-center justify-center z-10 absolute inset-0">
          <motion.span
            key={Math.floor(displaySeconds)}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 0.15 }}
            className="font-mono font-bold tabular-nums leading-none"
            style={{
              fontSize: displaySeconds < 10 ? '32px' : '28px',
              color: progressColor,
            }}
          >
            {centerDisplay}
          </motion.span>
          <span className="font-mono text-[10px] text-muted mt-[2px] tabular-nums">/ 15s</span>
        </div>
      </div>

      {/* CHANGED: Phase-aware status labels */}
      <div className="flex flex-col items-center mt-[6px] shrink-0">
        {!incident && (
          <span className="font-mono text-[10px] text-muted uppercase font-medium">
            Waiting for Anomaly
          </span>
        )}
        {/* Phase 1: Analysis in progress */}
        {isPhase1 && (
          <span className="font-mono text-[10px] uppercase font-medium" style={{ color: 'var(--accent)' }}>
            Analyzing…
          </span>
        )}
        {/* Phase 2: Stabilizing — RCA done, waiting for pod */}
        {isPhase2 && !isBreach && (
          <div className="flex flex-col items-center gap-[2px]">
            <span className="font-mono text-[10px] uppercase font-medium" style={{ color: '#22C55E' }}>
              RCA complete · Stabilizing…
            </span>
            <span className="font-mono text-[9px] text-muted tabular-nums">
              Analysis: {analysisTime?.toFixed(1) ?? '—'}s · Total: {displaySeconds.toFixed(1)}s
            </span>
          </div>
        )}
        {isActive && isBreach && (
          <span className="font-mono text-[10px] uppercase font-medium" style={{ color: 'var(--accent-breach)' }}>
            SLA Exceeded
          </span>
        )}
        {/* Phase 3: Resolved */}
        {isResolved && isPass && (
          <span className="font-mono text-[10px] font-medium uppercase" style={{ color: 'var(--accent)' }}>
            ✓ Within SLA
          </span>
        )}
        {isResolved && isBreach && (
          <span className="font-mono text-[10px] font-medium uppercase" style={{ color: 'var(--accent-breach)' }}>
            ✕ SLA Breached
          </span>
        )}
      </div>
    </div>
  );
}
