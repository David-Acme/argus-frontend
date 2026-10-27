import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import type { QrScanConfig } from '@/core/types';
import { useQrScanStore } from '@/core/stores';

export function useQrScan(purpose: QrScanConfig['purpose'], onValue: (value: string) => void) {
  const router = useRouter();
  const status = useQrScanStore((state) => state.status);
  const value = useQrScanStore((state) => state.value);
  const handler = useRef(onValue);
  const open = useCallback(() => {
    useQrScanStore.getState().open({ purpose });
    router.push('/qr');
  }, [purpose, router]);
  useEffect(() => {
    handler.current = onValue;
  }, [onValue]);
  useEffect(() => {
    if (status !== 'scanned' || value == null) return;
    useQrScanStore.getState().clear();
    handler.current(value);
  }, [status, value]);
  return open;
}
