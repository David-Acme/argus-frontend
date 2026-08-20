import { create } from 'zustand';
import { QR_SCAN_PURPOSES } from '@/shared/constants';
import type { QrScanConfig, QrScanStatus } from '@/core/types';

type QrScanStoreState = {
  config: QrScanConfig;
  value: string | null;
  status: QrScanStatus;
  open: (config?: Partial<QrScanConfig>) => void;
  setValue: (value: string) => void;
  cancel: () => void;
  clear: () => void;
};

const resolveConfig = (overrides?: Partial<QrScanConfig>): QrScanConfig => {
  const purpose = overrides?.purpose ?? 'generic';
  return { ...QR_SCAN_PURPOSES[purpose], ...overrides, purpose };
};

export const useQrScanStore = create<QrScanStoreState>((set) => ({
  config: resolveConfig(),
  value: null,
  status: 'idle',
  open: (config) => set({ config: resolveConfig(config), value: null, status: 'scanning' }),
  setValue: (value) => set({ value, status: 'scanned' }),
  cancel: () => set({ status: 'cancelled' }),
  clear: () => set({ value: null, status: 'idle' }),
}));
