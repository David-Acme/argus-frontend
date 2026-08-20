import { Pressable, View } from 'react-native';
import type { DashboardTab } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { DASHBOARD_TABS } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type DashboardBottomNavProps = {
  active: DashboardTab;
  /** One accessible label per tab, in `DASHBOARD_TABS` order. */
  labels: Record<DashboardTab, string>;
  composeLabel: string;
  bottomInset: number;
  onNavigate: (tab: DashboardTab) => void;
  onCompose: () => void;
};

export function DashboardBottomNav({
  active,
  labels,
  composeLabel,
  bottomInset,
  onNavigate,
  onCompose,
}: DashboardBottomNavProps) {
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-5 right-5 flex-row items-center gap-3"
      style={{ bottom: bottomInset + 14 }}>
      <View className="bg-card flex-1 flex-row items-center justify-between rounded-full p-2 shadow-lg shadow-black/[0.09]">
        {DASHBOARD_TABS.map((item) => {
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={composeLabel}
        onPress={onCompose}
        className="bg-interactive size-[60px] items-center justify-center rounded-full shadow-lg shadow-black/25 active:opacity-80">
        <Icon name="plus" className="text-foreground-on-interactive size-7" />
      </Pressable>
    </View>
  );
}
