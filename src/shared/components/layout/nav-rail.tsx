import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DashboardTab } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { IS_WEB, NAV_RAIL_WIDTH } from '@/shared/constants';
import { useDashboardNavigation } from '@/shared/components/layout/use-dashboard-navigation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { ComposeFab } from '@/shared/components/layout/compose-fab';

type NavRailProps = {
  active?: DashboardTab;
};

export function NavRail({ active }: NavRailProps) {
  const { tabs, labels, navigate } = useDashboardNavigation();
  const { isShort } = useWindowClass();
  const insets = useSafeAreaInsets();
  const target = isShort ? 'size-11' : 'size-12';
  const [hint, setHint] = useState<DashboardTab | null>(null);

  const showHint = (tab: DashboardTab) => {
    if (IS_WEB) setHint(tab);
  };
  const hideHint = (tab: DashboardTab) => setHint((current) => (current === tab ? null : current));

  return (
    <View
      className="bg-card z-10 items-center justify-between shadow-lg shadow-black/[0.06]"
      style={{
        width: NAV_RAIL_WIDTH,
        paddingTop: insets.top + (isShort ? 10 : 18),
        paddingBottom: insets.bottom + (isShort ? 10 : 18),
      }}>
      <View className={cn('items-center', isShort ? 'gap-1.5' : 'gap-2')}>
        {tabs.map((item) => {
          const selected = active === item.tab;
          return (
            <Pressable
              key={item.tab}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={labels[item.tab]}
              className={cn(
                target,
                'items-center justify-center rounded-[18px] active:opacity-70',
                selected ? 'bg-surface shadow-sm shadow-black/10' : 'web:hover:bg-surface-secondary/60 bg-transparent'
              )}
              onHoverIn={() => showHint(item.tab)}
              onHoverOut={() => hideHint(item.tab)}
              onFocus={() => showHint(item.tab)}
              onBlur={() => hideHint(item.tab)}
              onPress={() => navigate(item.tab)}>
              <Icon
                name={item.icon}
                className={cn('size-5', selected ? 'text-foreground' : 'text-foreground-secondary')}
              />
              {hint === item.tab ? (
                <View
                  pointerEvents="none"
                  className="bg-interactive web:w-max absolute left-full ml-3 rounded-lg px-2.5 py-1 shadow-md shadow-black/15">
                  <Text variant="caption" className="text-foreground-on-interactive font-medium">
                    {labels[item.tab]}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <ComposeFab size={isShort ? 44 : 48} anchor="rail" />
    </View>
  );
}
