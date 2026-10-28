import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { dictionaryLoaded, getLanguage, loadDictionary } from '@/core/i18n';
import { synchronizeService } from '@/core/services/sync';
import { sessionService } from '@/core/services/session.service';
import { useAuthStore } from '@/core/stores/auth.store';
import { IS_NATIVE } from '@/shared/constants';
import { BrandSplash } from '@/features/auth/components/brand-splash';

if (IS_NATIVE) {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

type SessionGateProps = PropsWithChildren;

export function SessionGate({ children }: SessionGateProps) {
  const [ready, setReady] = useState(
    () => sessionService.isInitialized && dictionaryLoaded(getLanguage())
  );

  useEffect(() => {
    let active = true;

    synchronizeService.bind(useAuthStore, {
      refreshSession: () => sessionService.refreshSession(),
      clearSession: (origin) => sessionService.clearSession(undefined, origin ?? 'sync'),
      updateUser: (partial) => sessionService.updateUser(partial),
      endSession: (notice) => sessionService.endSession(notice),
    });

    void Promise.allSettled([sessionService.initialize(), loadDictionary(getLanguage())]).then(
      () => {
        if (active) setReady(true);
      }
    );

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
