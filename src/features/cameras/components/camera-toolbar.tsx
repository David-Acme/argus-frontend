import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import type { IconName, MenuOption, TranslationKey } from '@/core/types';
import type {
  CameraCounts,
  CameraDensity,
  CameraSort,
  CameraStatusFilter,
} from '@/features/cameras/model/camera-overview';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { FilterChips, type FilterChipOption } from '@/shared/components/ui/filter-chips';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Input } from '@/shared/components/ui/input';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CameraToolbarProps = {
  query: string;
  status: CameraStatusFilter;
  sort: CameraSort;
  density: CameraDensity;
  counts: CameraCounts;
  compact: boolean;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: CameraStatusFilter) => void;
  onSortChange: (sort: CameraSort) => void;
  onDensityChange: (density: CameraDensity) => void;
};

type DensityOption = {
  value: CameraDensity;
  label: TranslationKey;
  icon: IconName;
};

const DENSITIES: readonly DensityOption[] = [
  { value: 'grid', label: 'screens.cameras.density-grid', icon: 'layout-grid' },
  { value: 'list', label: 'screens.cameras.density-list', icon: 'list' },
];

export function CameraToolbar({
  query,
  status,
  sort,
  density,
  counts,
  compact,
  onQueryChange,
  onStatusChange,
  onSortChange,
  onDensityChange,
}: CameraToolbarProps) {
  const { t } = useTranslation();

  const statusOptions = useMemo<FilterChipOption<CameraStatusFilter>[]>(
    () =>
      (['all', 'online', 'offline', 'disabled'] as const)
        .filter((value) => value === 'all' || value === status || counts[value] > 0)
        .map((value) => ({
          value,
          label: `${t(`screens.cameras.filter.${value}`)} ${counts[value]}`,
        })),
    [counts, status, t],
  );
  const sortOptions = useMemo<MenuOption<CameraSort>[]>(
    () => [
      { value: 'name', label: t('screens.cameras.sort.name'), icon: sort === 'name' ? 'check' : undefined },
      { value: 'status', label: t('screens.cameras.sort.status'), icon: sort === 'status' ? 'check' : undefined },
      { value: 'activity', label: t('screens.cameras.sort.activity'), icon: sort === 'activity' ? 'check' : undefined },
    ],
    [sort, t],
  );

  return (
    <View className={cn('gap-3', compact ? '' : 'flex-row items-center')}>
      <View
        className={cn(
          'bg-card h-11 flex-row items-center gap-2 rounded-full px-4 shadow-sm shadow-black/[0.05]',
          compact ? '' : 'w-72',
        )}>
        <Icon name="search" className="text-muted-foreground size-4" />
        <Input
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('screens.cameras.search')}
          accessibilityLabel={t('screens.cameras.search')}
          autoCapitalize="none"
          autoCorrect={false}
          className="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none dark:bg-transparent"
        />
      </View>
      <View className={cn('flex-row items-center gap-2', compact ? '' : 'min-w-0 flex-1')}>
        <View className="min-w-0 flex-1">
          <FilterChips options={statusOptions} value={status} onChange={onStatusChange} scroll />
        </View>
        <AdaptiveMenu
          options={sortOptions}
          onSelect={onSortChange}
          title={t('screens.cameras.sort.title')}
          closeLabel={t('common.close')}
          trigger={<IconButton icon="arrow-up-down" label={t('screens.cameras.sort.title')} />}
        />
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('screens.cameras.density')}
          className="bg-surface-secondary flex-row gap-1 rounded-full p-1">
          {DENSITIES.map((option) => {
            const selected = option.value === density;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={t(option.label)}
                onPress={() => onDensityChange(option.value)}
                className={cn(
                  'size-9 items-center justify-center rounded-full active:opacity-80',
                  selected && 'bg-interactive shadow-sm shadow-black/10',
                )}>
                <Icon
                  name={option.icon}
                  className={cn('size-4', selected ? 'text-foreground-on-interactive' : 'text-foreground-secondary')}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
