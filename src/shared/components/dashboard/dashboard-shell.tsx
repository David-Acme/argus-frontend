import { useMemo, type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DashboardTab } from '@/core/types';
import { BOTTOM_NAV_GAP, BOTTOM_NAV_HEIGHT, CONTENT_MAX_WIDTH } from '@/shared/constants';
import { useBottomNav } from '@/shared/hooks/use-bottom-nav';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { DashboardNavRail } from './dashboard-nav-rail';

type DashboardShellProps = {
  active: DashboardTab;
  labels: Record<DashboardTab, string>;
  composeLabel: string;
  onNavigate: (tab: DashboardTab) => void;
  onCompose: () => void;
  children: ReactNode;
  /**
   * Side column. Rendered beside the content on `expanded`, and on a short
   * `medium` window (a phone or tablet in landscape) where height is the
   * scarce axis. Otherwise it stacks under the content.
   */
  aside?: ReactNode;
  /**
   * Full-width band under the two columns. A wide timeline reads better across
   * the whole window than squeezed into the content column.
   */
  footer?: ReactNode;
  /**
   * `false` when the screen brings its own scroller (a list, a calendar grid):
   * nesting two of them makes the page drift while the inner list scrolls.
   */
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

/**
 * Responsive chrome shared by every dashboard screen: it owns the navigation
 * shape, the content width cap and the optional side column, so a screen only
 * describes its content. Structure branches on the window class, never on the
 * platform — a tablet and a small desktop window want the same thing.
 *
 * The rail is rendered here because it is a column of the layout; the floating
 * bottom bar is not — it is claimed from the global one in the root layout, so
 * it does not unmount on every route change.
 */
export function DashboardShell({
  active,
  labels,
  composeLabel,
  onNavigate,
  onCompose,
  children,
  aside,
  footer,
  scrollable = true,
}: DashboardShellProps) {
  const insets = useSafeAreaInsets();
  const { windowClass, isExpanded, isShort, isWide, usesNavRail } = useWindowClass();
  const maxWidth = CONTENT_MAX_WIDTH[windowClass];

  useBottomNav(useMemo(() => ({ composeLabel, onCompose }), [composeLabel, onCompose]));
  // A plain view takes the same props shape, so the tree below stays identical.
  const Scroller = scrollable ? ScrollView : NonScroller;

  return (
    <View className="bg-background flex-1 flex-row">
      {usesNavRail ? (
        <DashboardNavRail
          active={active}
          labels={labels}
          composeLabel={composeLabel}
          onNavigate={onNavigate}
        />
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
            // The status bar exists on a tablet too, and a landscape phone has
            // ~360dp of height, where portrait padding eats a third of it.
            style={{
              maxWidth,
              paddingTop: insets.top + (isShort ? 8 : isExpanded ? 20 : 18),
            }}>
            {/*
              Two columns when there is horizontal room, and also when the
              window is short and at least `medium` wide: in landscape the
              scarce axis is height, so stacking the aside is the worse trade.
            */}
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
