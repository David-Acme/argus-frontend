import { useMemo } from 'react';
import { View } from 'react-native';
import type { ActivityFilter, ActivityPeriod, MenuOption } from '@/core/types';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { FilterChips } from '@/shared/components/ui/filter-chips';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { DayPickerField } from '@/features/agenda';
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_PERIODS,
  EMPTY_ACTIVITY_FILTER,
  isFiltered,
} from '@/features/activity/model/activity-filter';

type ActivityFiltersProps = {
  filter: ActivityFilter;
  modules: readonly { id: string; name: string }[];
  people: readonly { id: number; name: string }[];
  onChange: (filter: ActivityFilter) => void;
};

const ALL = 'all';

export function ActivityFilters({ filter, modules, people, onChange }: ActivityFiltersProps) {
  const { t } = useTranslation();
  const periodOptions = useMemo(
    () => ACTIVITY_PERIODS.map((value) => ({ value, label: t(`screens.activity.periods.${value}`) })),
    [t]
  );
  const actionOptions = useMemo(
    () => [
      { value: ALL, label: t('screens.activity.filters.all-actions') },
      ...ACTIVITY_ACTIONS.map((value) => ({ value, label: t(`screens.activity.actions.${value}`) })),
    ],
    [t]
  );
  const moduleOptions: MenuOption[] = useMemo(
    () => [
      { value: ALL, label: t('screens.activity.filters.all-modules') },
      ...modules.map((module) => ({ value: module.id, label: module.name || module.id })),
    ],
    [modules, t]
  );
  const personOptions: MenuOption[] = useMemo(
    () => [
      { value: ALL, label: t('screens.activity.filters.all-people') },
      ...people.map((person) => ({ value: String(person.id), label: person.name })),
    ],
    [people, t]
  );

  const select = (
    label: string,
    options: readonly MenuOption[],
    value: string,
    onSelect: (value: string) => void
  ) => (
    <View className="min-w-40 flex-1 gap-1">
      <Text variant="micro" className="font-semibold tracking-wide uppercase">
        {label}
      </Text>
      <AdaptiveSelect
        options={options}
        value={value}
        onChange={onSelect}
        title={label}
        closeLabel={t('common.close')}
        searchPlaceholder={t('common.search')}
        emptyLabel={t('screens.users.no-results')}
        trigger={<SelectField label={options.find((option) => option.value === value)?.label} />}
      />
    </View>
  );

  const setPeriod = (period: ActivityPeriod) =>
    onChange({
      ...filter,
      period,
      from: period === 'custom' ? (filter.from ?? Date.now()) : null,
      to: period === 'custom' ? (filter.to ?? Date.now()) : null,
    });

  return (
    <View className="gap-3">
      <FilterChips options={periodOptions} value={filter.period} onChange={setPeriod} scroll />
      {filter.period === 'custom' ? (
        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-48 flex-1 gap-1">
            <Text variant="micro" className="font-semibold tracking-wide uppercase">
              {t('screens.activity.filters.from')}
            </Text>
            <DayPickerField
              value={new Date(filter.from ?? 0)}
              onChange={(day) => onChange({ ...filter, from: day.getTime() })}
            />
          </View>
          <View className="min-w-48 flex-1 gap-1">
            <Text variant="micro" className="font-semibold tracking-wide uppercase">
              {t('screens.activity.filters.to')}
            </Text>
            <DayPickerField
              value={new Date(filter.to ?? 0)}
              onChange={(day) => onChange({ ...filter, to: day.getTime() })}
            />
          </View>
        </View>
      ) : null}
      <View className="flex-row flex-wrap gap-3">
        {select(
          t('screens.activity.filters.module'),
          moduleOptions,
          filter.module ?? ALL,
          (value) => onChange({ ...filter, module: value === ALL ? null : value })
        )}
        {select(
          t('screens.activity.filters.person'),
          personOptions,
          filter.userId === null ? ALL : String(filter.userId),
          (value) => onChange({ ...filter, userId: value === ALL ? null : Number(value) })
        )}
        {select(
          t('screens.activity.filters.action'),
          actionOptions,
          filter.action ?? ALL,
          (value) =>
            onChange({ ...filter, action: value === ALL ? null : (value as ActivityFilter['action']) })
        )}
      </View>
      {isFiltered(filter) ? (
        <Button variant="ghost" size="sm" className="self-start" onPress={() => onChange(EMPTY_ACTIVITY_FILTER)}>
          <Text>{t('screens.activity.filters.clear')}</Text>
        </Button>
      ) : null}
    </View>
  );
}
