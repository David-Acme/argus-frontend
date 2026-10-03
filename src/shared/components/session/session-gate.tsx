import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { synchronizeService } from '@/core/services/sync';
import { sessionService } from '@/core/services/session.service';
import { useAuthStore } from '@/core/stores/auth.store';
import { IS_NATIVE } from '@/shared/constants';
import { BrandSplash } from './brand-splash';

if (IS_NATIVE) {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

type SessionGateProps = PropsWithChildren;

export function SessionGate({ children }: SessionGateProps) {
  const [ready, setReady] = useState(sessionService.isInitialized);

  useEffect(() => {
    let active = true;

    synchronizeService.bind(useAuthStore, {
      refreshSession: () => sessionService.refreshSession(),
      clearSession: () => sessionService.clearSession(),
      updateUser: (partial) => sessionService.updateUser(partial),
    });

    void sessionService
      .initialize()
      .finally(() => {
        if (active) setReady(true);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !IS_NATIVE) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return <BrandSplash />;
  return children;
}
