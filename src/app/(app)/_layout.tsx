import { Stack } from 'expo-router';
import { useUniwind } from 'uniwind';
import { AppShell } from '@/shared/components/layout';
import { EntryGate } from '@/shared/components/session/entry-gate';
import { NAV_FADE_MS } from '@/shared/constants';
import { BG_COLORS } from '@/shared/libs/theme';

export default function AppLayout() {
  const { theme } = useUniwind();

  return (
    <EntryGate>
      <AppShell>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: NAV_FADE_MS,
            contentStyle: { backgroundColor: BG_COLORS[theme === 'dark' ? 'dark' : 'light'] },
          }}
        />
      </AppShell>
    </EntryGate>
  );
}
