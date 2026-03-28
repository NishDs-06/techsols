import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';

const SLA_TARGET = 15;
const CIRCLE_RADIUS = 38;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export default function SLATimer() {
  const incident = useStore((s) => s.incident);
  const [elapsed, setElapsed] = useState<number>(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const isActive = incident && !incident.recovered_at;
  const isResolved = incident && incident.recovered_at !== null;

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
    } else {
      setElapsed(0);
      startRef.current = null;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }
  }, [isActive, isResolved, incident]);

  // Determine display state
  const displaySeconds = isResolved && incident?.actual_seconds
    ? incident.actual_seconds
    : elapsed;
  const progress = Math.min(displaySeconds / SLA_TARGET, 1);
  const remaining = Math.max(0, SLA_TARGET - displaySeconds);
  const isBreach = displaySeconds > SLA_TARGET;
  const isPass = isResolved && !isBreach;

  // Colors
  const progressColor = isBreach
    ? 'var(--accent-breach)'
    : isPass
      ? 'var(--accent)'
      : displaySeconds > 12
        ? 'var(--status-warning)'
        : 'var(--accent)';

  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  // Don't render if no incident at all
  if (!incident) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-1 select-none">
      {/* Header */}
      <div className="flex items-center justify-between w-full px-1 mb-1">
        <span className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">SLA Timer</span>
        <span className="font-mono text-[10px] text-muted">Target: {SLA_TARGET}s</span>
      </div>

      {/* Circle + Counter */}
      <div className="relative flex items-center justify-center" style={{ width: 92, height: 92 }}>
        {/* Background ring */}
        <svg
          width={92}
          height={92}
          viewBox="0 0 92 92"
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={46}
            cy={46}
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={3}
          />
          <circle
            cx={46}
            cy={46}
            r={CIRCLE_RADIUS}
            fill="none"
            stroke={progressColor}
            strokeWidth={3}
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke 400ms ease, stroke-dashoffset 150ms linear' }}
          />
        </svg>

        {/* Center text */}
        <div className="flex flex-col items-center z-10">
          <span
            className="font-mono font-bold tabular-nums leading-none"
            style={{
              fontSize: displaySeconds >= 10 ? '22px' : '24px',
              color: progressColor,
            }}
          >
            {displaySeconds.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Status label */}
      <div className="flex flex-col items-center gap-0.5 mt-0.5">
        {isActive && (
          <span className="font-mono text-[10px] text-muted">
            {remaining > 0 ? `${remaining.toFixed(1)}s remaining` : 'SLA exceeded'}
          </span>
        )}
        {isPass && (
          <span className="font-mono text-[10px] text-accent font-semibold tracking-wide">
            ✓ WITHIN SLA
          </span>
        )}
        {isResolved && isBreach && (
          <span className="font-mono text-[10px] font-semibold tracking-wide" style={{ color: 'var(--accent-breach)' }}>
            ✕ SLA BREACHED
          </span>
        )}
      </div>
    </div>
  );
}
