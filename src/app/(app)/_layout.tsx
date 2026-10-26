import { Stack } from 'expo-router';
import { useUniwind } from 'uniwind';
import { AppShell } from '@/shared/components/layout';
import { EntryGate, useDeepLinkRestore, useSignedInHistory } from '@/features/auth';
import { PrivacyGate } from '@/features/privacy';
import { ModuleNotices } from '@/features/modules';
import { GlobalCommand } from '@/features/command';
import { useCallPush } from '@/features/voice';
import { useBeaconController } from '@/features/proximity';
import { useTamperEvidenceKeeper } from '@/features/cameras';
import { useNotificationPermission, usePushRegistration } from '@/features/notification';
import { NAV_FADE_MS } from '@/shared/constants';
import { BG_COLORS } from '@/shared/components/layout/navigation-theme';

function DeepLinkRestore() {
  useDeepLinkRestore();
  return null;
}

export default function AppLayout() {
  const { theme } = useUniwind();
  usePushRegistration();
  useNotificationPermission();
  useSignedInHistory();
  useCallPush();
  useBeaconController();
  useTamperEvidenceKeeper();

  return (
    <EntryGate>
      <PrivacyGate>
      <AppShell>
        <ModuleNotices />
        <GlobalCommand />
        <DeepLinkRestore />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: NAV_FADE_MS,
            contentStyle: { backgroundColor: BG_COLORS[theme === 'dark' ? 'dark' : 'light'] },
          }}
        />
      </AppShell>
      </PrivacyGate>
    </EntryGate>
  );
}
