import { create } from 'zustand';
import type { ServiceState, IncidentMessage, Alert } from '../data/types';
import { mockAlerts } from '../data/mockAlerts';

export interface StoreState {
  connected: boolean;
  services: ServiceState[];
  incident: IncidentMessage | null;
  alerts: Alert[];
  bandwidthData: { time: string; in: number; out: number }[];

  setConnected: (status: boolean) => void;
  setServices: (services: ServiceState[]) => void;
  setIncident: (incident: IncidentMessage | null) => void;
  addAlert: (alert: Alert) => void;
  addBandwidthData: (data: { time: string; in: number; out: number }) => void;
}

const genBandwidth = () => {
  const d = [];
  const now = Date.now();
  for (let i = 0; i < 60; i++) {
    d.push({
      time: new Date(now - (60 - i) * 1000).toISOString(),
      in: 2.2 + (Math.random() * 0.6 - 0.3),
      out: 0.9 + (Math.random() * 0.2 - 0.1),
    });
  }
  return d;
};

export const useStore = create<StoreState>((set) => ({
  connected: false,
  services: [],
  incident: null,
  alerts: mockAlerts,
  bandwidthData: genBandwidth(),

  setConnected: (connected) => set({ connected }),
  setServices: (services) => set({ services }),
  setIncident: (incident) => set({ incident }),
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts] })),
  addBandwidthData: (data) =>
    set((s) => ({
      bandwidthData: [...s.bandwidthData.slice(-59), data],
    })),
}));
