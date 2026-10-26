import { Stack } from 'expo-router';
import { useUniwind } from 'uniwind';
import { EntryGate, useDeepLinkRestore, useSignedInHistory } from '@/features/auth';
import { PrivacyGate } from '@/features/privacy';
import { ModuleNotices } from '@/features/modules';
import { useCallPush } from '@/features/voice';
import { useBeaconController } from '@/features/proximity';
import { useTamperEvidenceKeeper } from '@/features/cameras';
import { useNotificationPermission, usePushRegistration } from '@/features/notification';
import { AppNavigation, useSectionRoute } from '@/features/navigation';
import { ASSISTANT_THREAD_HREF, NAV_FADE_MS } from '@/shared/constants';
import { BG_COLORS } from '@/shared/components/layout/navigation-theme';

function DeepLinkRestore() {
  useDeepLinkRestore();
  return null;
}

const noCommand = () => undefined;

const noListen = () => undefined;

export default function AppLayout() {
  const { theme } = useUniwind();
  const go = useSectionRoute();
  usePushRegistration();
  useNotificationPermission();
  useSignedInHistory();
  useCallPush();
  useBeaconController();
  useTamperEvidenceKeeper();
  const openThread = () => go(ASSISTANT_THREAD_HREF);
  const voice = { onOpenChat: openThread, onListenStart: openThread, onListenEnd: noListen };

  return (
    <EntryGate>
      <PrivacyGate>
        <AppNavigation voice={voice} onCommand={noCommand}>
          <ModuleNotices />
          <DeepLinkRestore />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: NAV_FADE_MS,
              contentStyle: { backgroundColor: BG_COLORS[theme === 'dark' ? 'dark' : 'light'] },
            }}
          />
        </AppNavigation>
      </PrivacyGate>
    </EntryGate>
  );
}
