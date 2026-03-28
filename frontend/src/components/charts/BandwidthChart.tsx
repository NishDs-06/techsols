import { useStore } from '../../store/useStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BandwidthChart() {
  const data = useStore((s) => s.bandwidthData);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 pt-5 pb-2 flex items-center">
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">Bandwidth · Live</span>
        <div
          className="ml-[6px] w-[12px] h-[12px] rounded-full border border-border flex items-center justify-center font-mono text-[8px] text-muted cursor-default shrink-0"
          title="Network throughput in/out of the cluster. ↑ = outbound (egress), ↓ = inbound (ingress)"
        >
          ?
        </div>
      </div>
      <div className="flex-1 w-full">
        {/* CHANGED: show "Waiting for data…" when no live data instead of rendering empty chart */}
        {data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[11px] text-muted animate-pulse">Waiting for data…</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeWidth={0.5} />
              <XAxis
                dataKey="time"
                tickFormatter={(t: string) => `${new Date(t).getSeconds()}s`}
                stroke="var(--text-muted)"
                fontSize={10}
                fontFamily="DM Mono"
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={10}
                fontFamily="DM Mono"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}`}
                domain={[0, 'dataMax + 0.5']}
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
                labelFormatter={(l: any) => new Date(l).toLocaleTimeString()}
              />
              <Area type="monotone" dataKey="in" stroke="var(--accent)" strokeWidth={1.5} fillOpacity={1} fill="url(#bandGrad)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
