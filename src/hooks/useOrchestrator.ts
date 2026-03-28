import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { startSimulation, stopSimulation } from '../data/mockSimulation';

export function useOrchestrator() {
  const setConnected = useStore((s) => s.setConnected);
  const setServices = useStore((s) => s.setServices);
  const setIncident = useStore((s) => s.setIncident);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket('ws://localhost:8000/ws');

        ws.onopen = () => {
          setConnected(true);
          stopSimulation();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'state') setServices(data.services);
            else if (data.type === 'incident') setIncident(data);
          } catch (e) {
            console.error('WS parse error', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          startSimulation();
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => ws?.close();
      } catch {
        setConnected(false);
        startSimulation();
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
      stopSimulation();
    };
  }, [setConnected, setServices, setIncident]);
}
