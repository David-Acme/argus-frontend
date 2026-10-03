import { type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DashboardTab } from '@/core/types';
import { BOTTOM_NAV_GAP, BOTTOM_NAV_HEIGHT, CONTENT_MAX_WIDTH } from '@/shared/constants';
import { useBottomNav } from '@/shared/hooks/use-bottom-nav';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { DashboardNavRail } from './dashboard-nav-rail';

type DashboardShellProps = {
  active: DashboardTab;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
};

type ScrollerProps = {
  className?: string;
  contentContainerClassName?: string;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  children: ReactNode;
};

function NonScroller({ className, children }: ScrollerProps) {
  return <View className={className}>{children}</View>;
}

export function DashboardShell({
  active,
  children,
  aside,
  footer,
  scrollable = true,
}: DashboardShellProps) {
  const insets = useSafeAreaInsets();
  const { windowClass, isExpanded, isShort, isWide, usesNavRail } = useWindowClass();
  const maxWidth = CONTENT_MAX_WIDTH[windowClass];

  useBottomNav(true);
  const Scroller = scrollable ? ScrollView : NonScroller;

  return (
    <View className="bg-background flex-1 flex-row">
      {usesNavRail ? (
        <DashboardNavRail active={active} />
      ) : null}

      <View className="flex-1">
        <Scroller
          className="flex-1"
          contentContainerClassName="grow"
          contentContainerStyle={{
            paddingBottom: usesNavRail
              ? 24
              : insets.bottom + BOTTOM_NAV_GAP + BOTTOM_NAV_HEIGHT + 12,
          }}
          showsVerticalScrollIndicator={false}>
          <View
            className="w-full flex-1 self-center px-5 lg:px-8"
            style={{
              maxWidth,
              paddingTop: insets.top + (isShort ? 8 : isExpanded ? 20 : 18),
            }}>
            {aside && isWide ? (
              <View className="flex-1 gap-5">
                <View className="flex-row items-stretch gap-5 lg:gap-6">
                  <View className="min-w-0 flex-1 gap-5">{children}</View>
                  <View className="w-[300px] shrink-0 gap-5 lg:w-[340px]">{aside}</View>
                </View>
                {footer}
              </View>
            ) : (
              <View className="flex-1 gap-5">
                {children}
                {aside}
                {footer}
              </View>
            )}
          </View>
        </Scroller>
      </View>
    </View>
  );
}
