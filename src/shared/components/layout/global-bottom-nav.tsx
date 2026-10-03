import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { selectBottomNavVisible, useNavigationStore } from '@/core/stores';
import type { DashboardTab } from '@/core/types';
import {
  BOTTOM_NAV_GAP,
  BOTTOM_NAV_MAX_WIDTH,
  BOTTOM_NAV_TRAVEL,
  DASHBOARD_ROUTE_TAB,
  NAV_FADE_MS,
} from '@/shared/constants';
import { useDashboardNavigation } from '@/shared/components/layout/use-dashboard-navigation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { easeOutCubic } from '@/shared/libs/animations';
import { ComposeFab } from '@/shared/components/layout/compose-fab';
import { BottomNav } from '@/shared/components/layout/bottom-nav';

let hasIntroduced = false;

export function GlobalBottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { tabs, labels, navigate } = useDashboardNavigation();
  const { usesNavRail } = useWindowClass();
  const owned = useNavigationStore((state) => state.owner !== null);
  const visible = useNavigationStore(selectBottomNavVisible) && !usesNavRail;
  const progress = useSharedValue(0);

  useEffect(() => {
    const duration = hasIntroduced ? 0 : NAV_FADE_MS;
    if (visible) hasIntroduced = true;
    progress.value = withTiming(visible ? 1 : 0, { duration, easing: easeOutCubic });
  }, [progress, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * BOTTOM_NAV_TRAVEL }],
  }));

  const active: DashboardTab = DASHBOARD_ROUTE_TAB[pathname] ?? 'home';
  if (!owned && !hasIntroduced) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      className="absolute right-0 left-0 items-center px-5"
      style={[{ bottom: insets.bottom + BOTTOM_NAV_GAP }, style]}>
      <View style={{ width: '100%', maxWidth: BOTTOM_NAV_MAX_WIDTH }}>
        <BottomNav
          tabs={tabs}
          active={active}
          labels={labels}
          onNavigate={navigate}
          compose={<ComposeFab />}
        />
      </View>
    </Animated.View>
  );
}
