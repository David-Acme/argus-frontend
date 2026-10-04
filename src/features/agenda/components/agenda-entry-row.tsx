import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntry, CalendarEntryState, CalendarSource, IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { isPendingEntry } from '@/features/agenda/model/calendar-optimistic';
import { ENTRY_STATE_RAIL, entryStateLabelKey, isQuietEntryState } from '@/features/agenda/model/entry-state';

type AgendaEntryRowProps = {
  entry: CalendarEntry;
  state: CalendarEntryState;
  compact: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  actions?: ReactNode;
  contextMenu?: (trigger: ReactElement) => ReactNode;
};

const SOURCE_ICON: Record<CalendarSource, IconName> = {
  event: 'calendar',
  task: 'list-todo',
  reminder: 'bell',
};

export function AgendaEntryRow({
  entry,
  state,
  compact,
  onPress,
  onLongPress,
  actions,
  contextMenu,
}: AgendaEntryRowProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const pending = isPendingEntry(entry);
  const done = entry.status === 'complete';
  const start = entry.isAllDay ? t('screens.agenda.event-all-day') : date.formatTime(new Date(entry.startsAt));
  const end = !entry.isAllDay && entry.endsAt ? date.formatTime(new Date(entry.endsAt)) : null;
  const sourceLabel = t(`screens.agenda.entry-${entry.source}`);
  const statusLabel = t(entryStateLabelKey(state));
  const meta = [sourceLabel, entry.location, isQuietEntryState(state) ? null : statusLabel].filter(
    (part): part is string => Boolean(part)
  );

  const pressable = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[entry.title, end ? `${start} – ${end}` : start, ...meta].join(', ')}
      className="web:hover:bg-surface-secondary/50 min-w-0 flex-1 flex-row items-center active:opacity-80"
      disabled={pending}
      onPress={onPress}
      onLongPress={onLongPress}>
      <View className={cn('w-[3px] self-stretch', ENTRY_STATE_RAIL[state])} />
      <View className={cn('justify-center py-3 pl-3', compact ? 'w-[68px]' : 'w-28 pl-4')}>
        <Text variant="label" className={cn('font-semibold', done && 'text-foreground-secondary')} numberOfLines={1}>
          {start}
        </Text>
        {end ? (
          <Text variant="micro" numberOfLines={1}>
            {end}
          </Text>
        ) : null}
      </View>
      <View className="min-w-0 flex-1 gap-0.5 py-3 pr-3">
        <Text
          variant="body"
          numberOfLines={1}
          className={cn('font-semibold', done && 'text-foreground-secondary line-through')}>
          {entry.title}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Icon name={SOURCE_ICON[entry.source]} className="text-muted-foreground size-3.5" />
          <Text variant="caption" numberOfLines={1} className="min-w-0 shrink">
            {meta.join(' · ')}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View
      accessibilityState={{ busy: pending }}
      className={cn(
        'bg-card dark:bg-card-secondary flex-row items-center overflow-hidden rounded-2xl shadow-sm shadow-black/[0.05]',
        pending && 'opacity-60'
      )}>
      {contextMenu ? contextMenu(pressable) : pressable}
      {actions ? <View className="pr-2">{actions}</View> : null}
    </View>
  );
}
