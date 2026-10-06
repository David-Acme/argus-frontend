import { Stack } from 'expo-router';
import { useUniwind } from 'uniwind';
import { AppShell } from '@/shared/components/layout';
import { EntryGate } from '@/features/auth';
import { PrivacyGate } from '@/features/privacy';
import { ModuleNotices } from '@/features/modules';
import { NAV_FADE_MS } from '@/shared/constants';
import { BG_COLORS } from '@/shared/components/layout/navigation-theme';

export default function AppLayout() {
  const { theme } = useUniwind();

  return (
    <EntryGate>
      <PrivacyGate>
      <AppShell>
        <ModuleNotices />
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
