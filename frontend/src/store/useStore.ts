import { create } from 'zustand';
import type { ServiceState, IncidentMessage, Alert } from '../data/types';
import { mockAlerts } from '../data/mockAlerts';

export interface RecoveryToast {
  message: string;
  resolvedAt: string;
  actualSeconds: number;
  reportPath?: string;
}

export interface StoreState {
  connected: boolean;
  services: ServiceState[];
  incident: IncidentMessage | null;
  alerts: Alert[];
  bandwidthData: { time: string; in: number; out: number }[];
  // ADDED: recovery toast state for Phase 3 notification
  recoveryToast: RecoveryToast | null;

  setConnected: (status: boolean) => void;
  setServices: (services: ServiceState[]) => void;
  setIncident: (incident: IncidentMessage | null) => void;
  addAlert: (alert: Alert) => void;
  addBandwidthData: (data: { time: string; in: number; out: number }) => void;
  setRecoveryToast: (toast: RecoveryToast | null) => void;
}

// CHANGED: removed genBandwidth() — start with empty array, no fake data
export const useStore = create<StoreState>((set) => ({
  connected: false,
  services: [],
  incident: null,
  alerts: mockAlerts,
  bandwidthData: [], // CHANGED: was genBandwidth(), now empty until live data arrives
  recoveryToast: null, // ADDED: recovery toast initial state

  setConnected: (connected) => set({ connected }),
  setServices: (services) => set({ services }),
  setIncident: (incident) => set({ incident }),
  addAlert: (alert) => set((s) => ({ alerts: [alert, ...s.alerts] })),
  addBandwidthData: (data) =>
    set((s) => ({
      bandwidthData: [...s.bandwidthData.slice(-59), data],
    })),
  // ADDED: recovery toast actions
  setRecoveryToast: (recoveryToast) => set({ recoveryToast }),
}));
