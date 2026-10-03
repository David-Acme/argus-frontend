import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DashboardTab } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { DASHBOARD_TABS, NAV_RAIL_WIDTH } from '@/shared/constants';
import { useDashboardNavigation } from '@/shared/hooks/use-dashboard-navigation';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { ComposeFab } from './compose-fab';

type DashboardNavRailProps = {
  active?: DashboardTab;
};

export function DashboardNavRail({ active }: DashboardNavRailProps) {
  const { labels, navigate } = useDashboardNavigation();
  const { canRead } = usePermissions();
  const { isShort } = useWindowClass();
  const tabs = DASHBOARD_TABS.filter((item) => !item.table || canRead(item.table));
  const insets = useSafeAreaInsets();
  const target = isShort ? 'size-11' : 'size-12';

  return (
    <View
      className="bg-card items-center justify-between shadow-lg shadow-black/[0.06]"
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
                selected ? 'bg-surface shadow-sm shadow-black/10' : 'bg-transparent'
              )}
              onPress={() => navigate(item.tab)}>
              <Icon
                name={item.icon}
                className={cn('size-5', selected ? 'text-foreground' : 'text-muted-foreground')}
              />
            </Pressable>
          );
        })}
      </View>

      <ComposeFab size={isShort ? 44 : 48} anchor="rail" />
    </View>
  );
}
