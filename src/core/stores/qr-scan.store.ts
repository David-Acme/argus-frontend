import { create } from 'zustand';

type QrScanState = {
  value: string | null;
  setValue: (value: string) => void;
  clear: () => void;
};

export const useQrScanStore = create<QrScanState>((set) => ({
  value: null,
  setValue: (value) => set({ value }),
  clear: () => set({ value: null }),
}));
