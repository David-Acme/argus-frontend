import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { DashboardTab } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import type { DASHBOARD_TABS } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type BottomNavProps = {
  tabs: typeof DASHBOARD_TABS;
  active: DashboardTab;
  labels: Record<DashboardTab, string>;
  onNavigate: (tab: DashboardTab) => void;
  compose: ReactNode;
};

export function BottomNav({
  tabs,
  active,
  labels,
  onNavigate,
  compose,
}: BottomNavProps) {
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
