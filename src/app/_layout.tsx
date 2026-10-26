import '../global.css';
import { IS_NATIVE, NAV_FADE_MS } from '@/shared/constants';
import { NAV_THEME, BG_COLORS } from '@/shared/components/layout/navigation-theme';
import { getThemePreference } from '@/shared/hooks/use-theme-preference';
import { AppState, View } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Uniwind, useUniwind } from 'uniwind';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog';
import { DisarmPinDialog } from '@/features/safety';
import { Toaster } from '@/shared/components/ui/toaster';
import { TopNoticeBar } from '@/shared/components/layout';
import { SessionGate } from '@/features/auth';
import { useAuthStore } from '@/core/stores';
import { CallPill, currentCallLockRedirect, IncomingCallSurface, useDesktopBridge } from '@/features/voice';
import { InAppAlertBanner } from '@/features/in-app-alert';
import { WatchPill } from '@/features/watch';
import { usePushListeners } from '@/features/notification';
import { deepLinkPath } from './+native-intent';
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const bg = BG_COLORS[isDark ? 'dark' : 'light'];

  useEffect(() => {
    Uniwind.setTheme(getThemePreference());
  }, []);

  useDesktopBridge(deepLinkPath);
  usePushListeners();

  const pathname = usePathname();
  const router = useRouter();
  const [keyguardCheck, setKeyguardCheck] = useState(0);
  const signedIn = useAuthStore((state) => state.status === 'signed-in');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setKeyguardCheck((tick) => tick + 1);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const href = currentCallLockRedirect(pathname);
    if (href) router.replace(href);
  }, [pathname, router, keyguardCheck, signedIn]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bg }}>
      <SystemBars style={isDark ? 'light' : 'dark'} hidden={false} />
      <SessionGate>
        <KeyboardProvider>
          <SafeAreaProvider>
            <ThemeProvider value={NAV_THEME[isDark ? 'dark' : 'light']}>
              <View style={{ flex: 1 }}>
                <TopNoticeBar />
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
              </View>
              <CallPill />
              <WatchPill />
              <IncomingCallSurface />
              <InAppAlertBanner />
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
