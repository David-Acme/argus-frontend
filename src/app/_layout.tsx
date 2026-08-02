import '../global.css';

import { NAV_THEME, BG_COLORS } from '@/shared/libs/theme';
import { getThemePreference } from '@/shared/hooks/use-theme-preference';
import { SystemBars } from 'react-native-edge-to-edge';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { Uniwind, useUniwind } from 'uniwind';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function RootLayout() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  useEffect(() => {
    Uniwind.setTheme(getThemePreference());
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: BG_COLORS[isDark ? 'dark' : 'light'] }}>
      <ThemeProvider value={NAV_THEME[isDark ? 'dark' : 'light']}>
        <SystemBars style={isDark ? 'light' : 'dark'} />
        <Stack />
        <PortalHost />
      </ThemeProvider>
    </View>
  );
}

export { ErrorBoundary } from 'expo-router';
