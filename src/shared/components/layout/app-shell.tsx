import { usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { NavRail } from '@/shared/components/layout/nav-rail';
import { DASHBOARD_ROUTE_TAB } from '@/shared/constants';
import { useWindowClass } from '@/shared/hooks/use-window-class';

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { usesNavRail } = useWindowClass();

  return (
    <View className="bg-background flex-1 flex-row">
      {usesNavRail ? <NavRail active={DASHBOARD_ROUTE_TAB[pathname]} /> : null}
      <View className="flex-1">{children}</View>
    </View>
  );
}
