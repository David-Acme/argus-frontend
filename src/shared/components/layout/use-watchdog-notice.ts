import { useEffect, useState, useSyncExternalStore } from 'react';
import { heartbeatService, nextNoticeCheckMs, watchdogNotice } from '@/core/services/heartbeat';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { useAuthStore } from '@/core/stores';
import type { WatchdogNotice } from '@/core/types';

const subscribeConnection = (onChange: () => void) => {
  const offConnect = synchronizeService.onConnect(onChange);
  const offDisconnect = synchronizeService.onDisconnect(onChange);
  return () => {
    offConnect();
    offDisconnect();
  };
};

const isConnected = () => synchronizeService.isSocketConnected;
const subscribeHeartbeat = (onChange: () => void) => heartbeatService.subscribe(onChange);
const lastHeartbeat = () => heartbeatService.last();

export function useWatchdogNotice(): WatchdogNotice {
  const signedIn = useAuthStore((state) => state.status === 'signed-in');
  const connected = useSyncExternalStore(subscribeConnection, isConnected, isConnected);
  const record = useSyncExternalStore(subscribeHeartbeat, lastHeartbeat, lastHeartbeat);
  const disconnectedAt = connected ? null : heartbeatService.disconnectedAt();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (signedIn) heartbeatService.start();
  }, [signedIn]);

  useEffect(() => {
    const due = nextNoticeCheckMs({ record, connected, disconnectedAt, now: Date.now() });
    if (due === null) return;
    const timer = setTimeout(() => setNow(Date.now()), due + 50);
    return () => clearTimeout(timer);
  }, [record, connected, disconnectedAt, now]);

  if (!signedIn) return { kind: 'none' };
  return watchdogNotice({ record, connected, disconnectedAt, now });
}
