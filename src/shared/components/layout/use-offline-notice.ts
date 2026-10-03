import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/core/stores';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { OFFLINE_NOTICE_DELAY_MS } from '@/shared/constants';

const subscribe = (onChange: () => void) => {
  const offConnect = synchronizeService.onConnect(onChange);
  const offDisconnect = synchronizeService.onDisconnect(onChange);
  return () => {
    offConnect();
    offDisconnect();
  };
};

const isConnected = () => synchronizeService.isSocketConnected;

export function useOfflineNotice(): boolean {
  const signedIn = useAuthStore((state) => state.status === 'signed-in');
  const connected = useSyncExternalStore(subscribe, isConnected, isConnected);
  const [overdue, setOverdue] = useState(false);

  useEffect(() => {
    if (connected || !signedIn) return;
    const timer = setTimeout(() => setOverdue(true), OFFLINE_NOTICE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setOverdue(false);
    };
  }, [connected, signedIn]);

  return signedIn && !connected && overdue;
}
