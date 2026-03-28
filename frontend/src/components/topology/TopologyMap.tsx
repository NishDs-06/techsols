import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { SERVICE_EDGES } from '../../data/serviceGraph';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
}

const STATUS_COLORS: Record<string, string> = {
  normal: '#9CA3AF',
  warning: '#F59E0B',
  critical: '#D97706',
  root: '#DC2626',
  recovering: '#3B82F6',
  recovered: '#16A34A',
};

export default function TopologyMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const services = useStore((s) => s.services);
  const incident = useStore((s) => s.incident);
  const navigate = useNavigate();

  // Stable simulation ref
  const simRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const [, setTick] = useState(0);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initialize simulation once
  useEffect(() => {
    if (services.length === 0) return;

    if (!simRef.current) {
      const nodes: SimNode[] = services.map((s) => ({ id: s.name, x: dims.w / 2, y: dims.h / 2 }));
      nodesRef.current = nodes;

      const links = SERVICE_EDGES.map((e) => ({ source: e.source, target: e.target }));

      simRef.current = d3
        .forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120).strength(0.4))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(dims.w / 2, dims.h / 2))
        .force('collide', d3.forceCollide(50))
        .on('tick', () => setTick((t) => t + 1));
    } else {
      simRef.current.force('center', d3.forceCenter(dims.w / 2, dims.h / 2));
      simRef.current.alpha(0.1).restart();
    }
  }, [services, dims]);

  const getColor = useCallback((name: string) => {
    const svc = services.find((s) => s.name === name);
    return STATUS_COLORS[svc?.status || 'normal'];
  }, [services]);

  const getConf = useCallback((name: string) => {
    const svc = services.find((s) => s.name === name);
    return svc?.anomaly_confidence ?? 0;
  }, [services]);

  const getRadius = useCallback((name: string) => {
    const conf = getConf(name);
    return 20 + conf * 24;
  }, [getConf]);

  const isRcaEdge = useCallback(
    (src: string, tgt: string) => {
      if (!incident || incident.recovered_at) return false;
      const path = incident.affected_services;
      for (let i = 0; i < path.length - 1; i++) {
        if (path[i] === src && path[i + 1] === tgt) return true;
        if (path[i] === tgt && path[i + 1] === src) return true;
      }
      return false;
    },
    [incident]
  );

  const nodes = nodesRef.current;
  const edges = SERVICE_EDGES;

  return (
    <div className="w-full h-full relative overflow-hidden" ref={containerRef}>
      <svg width={dims.w} height={dims.h} className="absolute inset-0">
        <defs>
          {/* Animated dash pattern for RCA edges */}
          <style>{`
            @keyframes dashFlow {
              to { stroke-dashoffset: -24; }
            }
            .rca-edge {
              animation: dashFlow 0.6s linear infinite;
            }
          `}</style>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const source = nodes.find((n) => n.id === e.source);
          const target = nodes.find((n) => n.id === e.target);
          if (!source || !target) return null;
          const rca = isRcaEdge(source.id, target.id);
          return (
            <g key={i}>
              {/* Shadow edge for RCA glow */}
              {rca && (
                <line
                  x1={source.x || 0}
                  y1={source.y || 0}
                  x2={target.x || 0}
                  y2={target.y || 0}
                  stroke="#DC2626"
                  strokeWidth={6}
                  opacity={0.15}
                />
              )}
              <line
                x1={source.x || 0}
                y1={source.y || 0}
                x2={target.x || 0}
                y2={target.y || 0}
                stroke={rca ? '#DC2626' : 'var(--border)'}
                strokeWidth={rca ? 2.5 : 1}
                opacity={rca ? 1 : 0.4}
                strokeDasharray={rca ? '8 4' : 'none'}
                className={rca ? 'rca-edge' : 'transition-all duration-500'}
              />
              {/* Arrow indicator on RCA path */}
              {rca && source.x && source.y && target.x && target.y && (
                <circle
                  cx={(source.x + target.x) / 2}
                  cy={(source.y + target.y) / 2}
                  r={3}
                  fill="#DC2626"
                  opacity={0.8}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const r = getRadius(node.id);
          const color = getColor(node.id);
          const conf = getConf(node.id);
          const svc = services.find((s) => s.name === node.id);
          const isRoot = svc?.status === 'root';
          const isCritical = svc?.status === 'critical';
          const isRecovering = svc?.status === 'recovering';

          return (
            <g
              key={node.id}
              transform={`translate(${node.x || 0}, ${node.y || 0})`}
              onClick={() => navigate(`/node/${node.id}`)}
              className="cursor-pointer"
            >
              {/* Outer ring on hover */}
              <motion.circle
                r={r + 8}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1.5}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              />
              {/* Pulse ring for root/critical nodes */}
              {(isRoot || isCritical) && (
                <circle r={r + 4} fill="none" stroke={color} strokeWidth={1} opacity={0.5} className="animate-pulse-dot" />
              )}
              {/* Recovering spin ring */}
              {isRecovering && (
                <>
                  <circle
                    r={r + 5}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth={1.5}
                    strokeDasharray={`${(r + 5) * 1.2} ${(r + 5) * 5}`}
                    opacity={0.7}
                    style={{ animation: 'spin 2s linear infinite', transformOrigin: 'center' }}
                  />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              )}
              {/* Main circle */}
              <motion.circle
                r={r}
                fill={color}
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                stroke="var(--bg-base)"
                strokeWidth={3}
                style={{ transition: 'fill 500ms ease' }}
              />
              {/* Confidence value */}
              <text y={-2} textAnchor="middle" fill="var(--bg-base)" fontSize={10} className="font-mono font-bold pointer-events-none">
                {(conf * 100).toFixed(0)}%
              </text>
              {/* Service name */}
              <text y={r + 16} textAnchor="middle" fill="var(--text-primary)" fontSize={11} className="font-sora font-medium pointer-events-none tracking-wide">
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
