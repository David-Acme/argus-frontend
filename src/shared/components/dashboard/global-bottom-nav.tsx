import { usePathname, useRouter } from 'expo-router';
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
  DASHBOARD_TAB_ROUTE,
  NAV_FADE_MS,
} from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { easeOutCubic } from '@/shared/libs/animations';
import { ComposeFab } from './compose-fab';
import { DashboardBottomNav } from './dashboard-bottom-nav';

/** Survives remounts: the intro animation belongs to the launch, not to a screen. */
let hasIntroduced = false;

/**
 * The app's one bottom bar, mounted by the root layout. Screens ask for it
 * through the navigation store instead of rendering their own copy, so moving
 * between tabs fades the content while the bar stays put — no unmount, no
 * flicker, and a single place that knows where each tab leads.
 */
export function GlobalBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { usesNavRail } = useWindowClass();
  const context = useNavigationStore((state) => state.context);
  const visible = useNavigationStore(selectBottomNavVisible) && !usesNavRail;
  const progress = useSharedValue(0);

  useEffect(() => {
    // The bar fades in once per launch; after that it is furniture, and
    // replaying the animation on every route change reads as flicker.
    const duration = hasIntroduced ? 0 : NAV_FADE_MS;
    if (visible) hasIntroduced = true;
    progress.value = withTiming(visible ? 1 : 0, { duration, easing: easeOutCubic });
  }, [progress, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * BOTTOM_NAV_TRAVEL }],
  }));

  const active: DashboardTab = DASHBOARD_ROUTE_TAB[pathname] ?? 'home';
  // The store keeps the last context past a release, so nothing goes blank
  // halfway through the fade-out.
  if (!context) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      className="absolute right-0 left-0 items-center px-5"
      style={[{ bottom: insets.bottom + BOTTOM_NAV_GAP }, style]}>
      <View style={{ width: '100%', maxWidth: BOTTOM_NAV_MAX_WIDTH }}>
        <DashboardBottomNav
          active={active}
          labels={{
            home: t('screens.home.home'),
            schedule: t('screens.agenda.schedule'),
            projects: t('screens.projects.title'),
            profile: t('screens.home.profile'),
          }}
          onNavigate={(tab) => router.replace(DASHBOARD_TAB_ROUTE[tab])}
          compose={<ComposeFab />}
        />
      </View>
    </Animated.View>
  );
}
