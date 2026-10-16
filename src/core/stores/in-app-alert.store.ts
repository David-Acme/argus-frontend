import { create } from 'zustand';
import type { InAppAlert } from '@/core/services/push/in-app-alert';

type InAppAlertState = {
  alert: InAppAlert | null;
  show: (alert: InAppAlert) => void;
  dismiss: () => void;
};

export const useInAppAlertStore = create<InAppAlertState>((set) => ({
  alert: null,
  show: (alert) =>
    set((state) => (state.alert?.critical && !alert.critical ? state : { alert })),
  dismiss: () => set({ alert: null }),
}));
