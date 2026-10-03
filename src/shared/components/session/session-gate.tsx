import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { synchronizeService } from '@/core/services/sync';
import { sessionService } from '@/core/services/session.service';
import { useAuthStore } from '@/core/stores/auth.store';
import { IS_NATIVE } from '@/shared/constants';
import { Text } from '@/shared/components/ui/text';

if (IS_NATIVE) {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

type SessionGateProps = PropsWithChildren;

function SessionSplash() {
  return (
    <View
      className="bg-background flex-1 items-center justify-center gap-5 px-8"
      accessibilityLabel="Argus">
      <View className="bg-interactive size-24 items-center justify-center rounded-[28px] shadow-lg shadow-black/10">
        <View className="border-foreground-on-interactive size-12 items-center justify-center rounded-full border-[3px]">
          <View className="bg-foreground-on-interactive absolute left-2.5 size-1.5 rounded-full" />
          <View className="bg-foreground-on-interactive absolute right-2.5 size-1.5 rounded-full" />
        </View>
      </View>
      <Text variant="h3">Argus</Text>
      <ActivityIndicator accessibilityLabel="Loading" />
    </View>
  );
}

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

  if (!ready) return <SessionSplash />;
  return children;
}
