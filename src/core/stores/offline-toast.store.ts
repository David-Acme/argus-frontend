import { create } from 'zustand';

type OfflineToastState = {
  toastId: string | null;
  setToastId: (toastId: string | null) => void;
};

export const useOfflineToastStore = create<OfflineToastState>((set) => ({
  toastId: null,
  setToastId: (toastId) => set({ toastId }),
}));
