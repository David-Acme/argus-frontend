import '../global.css';
import { IS_NATIVE, NAV_FADE_MS } from '@/shared/constants';
import { NAV_THEME, BG_COLORS } from '@/shared/components/layout/navigation-theme';
import { getThemePreference } from '@/shared/hooks/use-theme-preference';
import { SystemBars } from 'react-native-edge-to-edge';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack } from 'expo-router';
import { Uniwind, useUniwind } from 'uniwind';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalBottomNav } from '@/shared/components/layout/global-bottom-nav';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { DisarmPinDialog } from '@/features/safety';
import { Toaster } from '@/shared/components/ui/toaster';
import { OfflineBanner } from '@/shared/components/layout';
import { SessionGate } from '@/features/auth';
import { CallPill } from '@/features/voice';
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const bg = BG_COLORS[isDark ? 'dark' : 'light'];

  useEffect(() => {
    Uniwind.setTheme(getThemePreference());
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      <SystemBars style={isDark ? 'light' : 'dark'} />
      <SessionGate>
        <KeyboardProvider>
          <SafeAreaProvider>
            <ThemeProvider value={NAV_THEME[isDark ? 'dark' : 'light']}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  animationDuration: NAV_FADE_MS,
                  animationTypeForReplace: 'push',
                  contentStyle: { backgroundColor: bg },
                }}>
                <Stack.Protected guard={IS_NATIVE}>
                  <Stack.Screen name="qr" />
                  <Stack.Screen name="approve" />
                </Stack.Protected>
                <Stack.Screen name="welcome" />
                <Stack.Screen name="login" />
                <Stack.Screen name="(app)" />
              </Stack>
              <GlobalBottomNav />
              <CallPill />
              <OfflineBanner />
              <ConfirmDialog />
              <DisarmPinDialog />
              <Toaster />
              <PortalHost />
            </ThemeProvider>
          </SafeAreaProvider>
        </KeyboardProvider>
      </SessionGate>
    </GestureHandlerRootView>
  );
}
