import '../global.css';
import { IS_NATIVE, NAV_FADE_MS } from '@/shared/constants';
import { NAV_THEME, BG_COLORS } from '@/shared/libs/theme';
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
import { GlobalBottomNav } from '@/shared/components/dashboard';
import { ConfirmDialog } from '@/shared/components/confirm';
import { Toaster } from '@/shared/components/toast';
import { SessionGate } from '@/shared/components/session/session-gate';
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
                  // Every route crossfades: `animationTypeForReplace` matters
                  // because tab navigation replaces instead of pushing.
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
                <Stack.Screen name="agenda" />
                <Stack.Screen name="projects" />
                <Stack.Screen name="cameras" />
              </Stack>
              {/* Above the Stack so they survive every route change. */}
              <GlobalBottomNav />
              <ConfirmDialog />
              <Toaster />
              <PortalHost />
            </ThemeProvider>
          </SafeAreaProvider>
        </KeyboardProvider>
      </SessionGate>
    </GestureHandlerRootView>
  );
}
