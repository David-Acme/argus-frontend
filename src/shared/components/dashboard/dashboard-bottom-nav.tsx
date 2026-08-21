import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { DashboardTab } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { DASHBOARD_TABS } from '@/shared/constants';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { cn } from '@/shared/libs/utils';

type DashboardBottomNavProps = {
  active: DashboardTab;
  /** One accessible label per tab, in `DASHBOARD_TABS` order. */
  labels: Record<DashboardTab, string>;
  onNavigate: (tab: DashboardTab) => void;
  /** The compose control, so the bar and the rail share one menu. */
  compose: ReactNode;
};

/**
 * The floating bar itself: pill of tabs plus the compose button. Placement,
 * safe area and visibility belong to `GlobalBottomNav`, which mounts this once
 * for the whole app.
 */
export function DashboardBottomNav({
  active,
  labels,
  onNavigate,
  compose,
}: DashboardBottomNavProps) {
  const { canRead } = usePermissions();
  const tabs = DASHBOARD_TABS.filter((item) => !item.table || canRead(item.table));

  return (
    <View pointerEvents="box-none" className="flex-row items-center gap-3">
      <View className="bg-card flex-1 flex-row items-center justify-between rounded-full p-2 shadow-lg shadow-black/[0.09]">
        {tabs.map((item) => {
          const selected = active === item.tab;
          return (
            <Pressable
              key={item.tab}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={labels[item.tab]}
              className={cn(
                'size-11 items-center justify-center rounded-full active:opacity-70',
                // A raised well, not a filled chip: the bar stays one surface.
                selected ? 'bg-surface shadow-sm shadow-black/10' : 'bg-transparent'
              )}
              onPress={() => onNavigate(item.tab)}>
              <Icon
                name={item.icon}
                className={cn('size-5', selected ? 'text-foreground' : 'text-muted-foreground')}
              />
            </Pressable>
          );
        })}
      </View>
      {compose}
    </View>
  );
}
