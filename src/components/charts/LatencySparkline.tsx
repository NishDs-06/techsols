import { useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LatencySparkline({ serviceName }: { serviceName: string }) {
  const incident = useStore((s) => s.incident);

  const data = useMemo(() => {
    const points = [];
    const now = Date.now();
    for (let i = 0; i < 288; i++) {
      const t = now - (288 - i) * 300000;
      let p95 = 20 + Math.random() * 15;
      if (incident && incident.root_service === serviceName) {
        const iTime = new Date(incident.injected_at).getTime();
        if (Math.abs(t - iTime) < 15 * 60000) p95 *= 8;
      }
      points.push({ time: t, p95 });
    }
    return points;
  }, [serviceName, incident]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 pt-5 pb-2">
        <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">24h Latency p95</span>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeWidth={0.5} />
            <XAxis
              dataKey="time"
              tickFormatter={(t: number) => {
                const d = new Date(t);
                return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
              }}
              stroke="var(--text-muted)"
              fontSize={10}
              fontFamily="DM Mono"
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={10}
              fontFamily="DM Mono"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${Math.round(v)}ms`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                fontFamily: '"DM Mono", monospace',
                fontSize: '11px',
                borderRadius: '4px',
                color: 'var(--text-primary)',
              }}
              labelFormatter={(l: number) => new Date(l).toLocaleTimeString()}
            />
            <Line type="stepAfter" dataKey="p95" stroke="var(--accent)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
