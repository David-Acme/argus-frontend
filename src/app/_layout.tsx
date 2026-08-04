import '../global.css';
import { IS_NATIVE } from '@/shared/constants';
import { NAV_THEME, BG_COLORS } from '@/shared/libs/theme';
import { getThemePreference } from '@/shared/hooks/use-theme-preference';
import { SystemBars } from 'react-native-edge-to-edge';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { Uniwind, useUniwind } from 'uniwind';
import { useEffect } from 'react';
import { View } from 'react-native';
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';
  const bg = BG_COLORS[isDark ? 'dark' : 'light'];

  useEffect(() => {
    Uniwind.setTheme(getThemePreference());
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ThemeProvider value={NAV_THEME[isDark ? 'dark' : 'light']}>
        <SystemBars style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'flip',
            contentStyle: { backgroundColor: bg },
          }}>
          <Stack.Protected guard={IS_NATIVE}>
            <Stack.Screen name="qr" />
          </Stack.Protected>
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </View>
  );
}
