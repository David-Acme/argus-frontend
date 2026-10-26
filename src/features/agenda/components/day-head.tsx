import { View } from 'react-native';
import { Text } from '@/shared/ui/text';
import type { DayGroup } from '@/features/agenda/model/agenda-days';
import { dayWord } from '@/features/agenda/model/agenda-lines';
import type { ListContext } from '@/features/agenda/components/agenda-list';

export type DayHeadProps = { group: DayGroup; context: ListContext };

export function DayHead({ group, context }: DayHeadProps) {
  const { t, date } = context;
  const late =
    group.overdue === 1
      ? t('screens.agenda.page.late-one')
      : t('screens.agenda.page.late-many', { count: group.overdue });
  return (
    <View className="flex-row items-baseline gap-2 px-4 pt-6 pb-1">
      <Text variant="section" heading={2}>
        {date.formatDayMonth(new Date(group.at))}
      </Text>
      <Text variant="feed" tone="3">
        {dayWord(group.at, context)}
      </Text>
      {group.overdue > 0 ? (
        <View className="ml-auto">
          <Text variant="sectionMeta" tone="alert">
            {late}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
