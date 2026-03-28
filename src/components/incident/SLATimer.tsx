import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { motion } from 'framer-motion';

const SLA_TARGET = 15;

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
  const remaining = Math.max(0, SLA_TARGET - displaySeconds);
  const isBreach = displaySeconds > SLA_TARGET;
  const isPass = isResolved && !isBreach;

  // Colors
  const progressColor = !incident
    ? 'var(--text-muted)'
    : isBreach
      ? 'var(--accent-breach)'
      : isPass
        ? 'var(--accent)'
        : displaySeconds > 12
          ? 'var(--status-warning)'
          : 'var(--accent)';

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
            {Math.floor(displaySeconds)}s
          </motion.span>
          <span className="font-mono text-[10px] text-muted mt-[2px] tabular-nums">/ 15s</span>
        </div>
      </div>

      {/* Status label */}
      <div className="flex flex-col items-center mt-[6px] shrink-0">
        {!incident && (
          <span className="font-mono text-[10px] text-muted uppercase font-medium">
            Waiting for Anomaly
          </span>
        )}
        {isActive && !isBreach && (
          <span className="font-mono text-[10px] text-muted tabular-nums">
            {remaining.toFixed(1)}s remaining
          </span>
        )}
        {isActive && isBreach && (
          <span className="font-mono text-[10px] uppercase font-medium" style={{ color: 'var(--accent-breach)' }}>
            SLA Exceeded
          </span>
        )}
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
