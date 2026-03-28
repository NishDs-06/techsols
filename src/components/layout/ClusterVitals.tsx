import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';

interface Vitals {
  clusterCPU: number;
  clusterMem: number;
  totalPods: number;
  readyPods: number;
  errorRate: number;
  requests: number; // req/s
}

export default function ClusterVitals() {
  const services = useStore((s) => s.services);
  const incident = useStore((s) => s.incident);
  const [vitals, setVitals] = useState<Vitals>({
    clusterCPU: 34,
    clusterMem: 52,
    totalPods: 24,
    readyPods: 24,
    errorRate: 0.12,
    requests: 1847,
  });

  const animRef = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const isActive = incident && !incident.recovered_at;
      setVitals((prev) => {
        const cpuBase = isActive ? 68 : 34;
        const memBase = isActive ? 61 : 52;
        const errBase = isActive ? 2.4 : 0.12;
        const reqBase = isActive ? 1240 : 1847;
        const readyBase = isActive ? 21 : 24;

        return {
          clusterCPU: +(cpuBase + (Math.random() - 0.5) * 6).toFixed(1),
          clusterMem: +(memBase + (Math.random() - 0.5) * 4).toFixed(1),
          totalPods: 24,
          readyPods: readyBase,
          errorRate: +(errBase + (Math.random() - 0.5) * 0.08).toFixed(2),
          requests: Math.round(reqBase + (Math.random() - 0.5) * 120),
        };
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [incident]);

  const items = [
    { label: 'CLUSTER CPU', value: `${vitals.clusterCPU}%`, color: vitals.clusterCPU > 60 ? 'var(--status-warning)' : 'var(--text-primary)' },
    { label: 'MEMORY', value: `${vitals.clusterMem}%`, color: vitals.clusterMem > 70 ? 'var(--status-warning)' : 'var(--text-primary)' },
    { label: 'PODS', value: `${vitals.readyPods}/${vitals.totalPods}`, color: vitals.readyPods < vitals.totalPods ? 'var(--status-warning)' : 'var(--accent)' },
    { label: 'ERROR RATE', value: `${vitals.errorRate}%`, color: vitals.errorRate > 1 ? 'var(--status-warning)' : 'var(--text-primary)' },
    { label: 'REQ/S', value: vitals.requests.toLocaleString(), color: 'var(--text-primary)' },
  ];

  return (
    <div className="flex items-center gap-6 px-4 py-2">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2">
          {i > 0 && <div className="w-[1px] h-[14px] bg-border mr-2" />}
          <span className="font-mono text-[9px] tracking-[0.14em] text-muted uppercase">{item.label}</span>
          <span
            className="font-mono text-[13px] font-medium tabular-nums transition-colors duration-500"
            style={{ color: item.color }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
