import { useEffect } from 'react';
import { useStore } from '../store/useStore';
// CHANGED: removed startSimulation/stopSimulation imports — no more mock fallback

export function useOrchestrator() {
  const setConnected = useStore((s) => s.setConnected);
  const setServices = useStore((s) => s.setServices);
  const setIncident = useStore((s) => s.setIncident);
  const addBandwidthData = useStore((s) => s.addBandwidthData);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket('ws://100.88.95.52:8000/ws');

        ws.onopen = () => {
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'state') {
              setServices(data.services);
              // ADDED: push live bandwidth data from orchestrator
              if (data.bandwidth) {
                addBandwidthData(data.bandwidth);
              }
            }
            else if (data.type === 'incident') setIncident(data);
          } catch (e) {
            console.error('WS parse error', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          // CHANGED: do NOT start mock simulation on disconnect
          // Dashboard will show "Waiting for data…" instead of faking it
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => ws?.close();
      } catch {
        setConnected(false);
        // CHANGED: no mock fallback here either
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [setConnected, setServices, setIncident]);
}
