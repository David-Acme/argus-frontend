import { Stack } from 'expo-router';
import { useUniwind } from 'uniwind';
import { EntryGate, useDeepLinkRestore, useSignedInHistory } from '@/features/auth';
import { PrivacyGate } from '@/features/privacy';
import { ModuleNotices } from '@/features/modules';
import { GlobalCommand, useCommandLauncher } from '@/features/command';
import { ArgusListening, useArgusVoice, useCallPush } from '@/features/voice';
import { useBeaconController } from '@/features/proximity';
import { useTamperEvidenceKeeper } from '@/features/cameras';
import { useNotificationPermission, usePushRegistration } from '@/features/notification';
import { AppNavigation } from '@/features/navigation';
import { useConversationRuntime } from '@/features/conversations';
import { NAV_FADE_MS } from '@/shared/constants';
import { BG_COLORS } from '@/shared/components/layout/navigation-theme';

function DeepLinkRestore() {
  useDeepLinkRestore();
  return null;
}

export default function AppLayout() {
  const { theme } = useUniwind();
  const command = useCommandLauncher();
  usePushRegistration();
  useNotificationPermission();
  useSignedInHistory();
  useCallPush();
  useBeaconController();
  useTamperEvidenceKeeper();
  useConversationRuntime();
  const { voice, listening } = useArgusVoice();

  return (
    <EntryGate>
      <PrivacyGate>
        <AppNavigation voice={voice} listening={listening} onCommand={() => command.open()}>
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
        </AppNavigation>
        <ArgusListening />
      </PrivacyGate>
    </EntryGate>
  );
}
