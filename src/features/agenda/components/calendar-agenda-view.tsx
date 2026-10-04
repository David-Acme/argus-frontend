import { LegendList } from '@legendapp/list/react-native';
import { useCallback, useMemo, type ReactElement, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { AgendaEntryRow } from '@/features/agenda/components/agenda-entry-row';
import { agendaRows, type AgendaRow } from '@/features/agenda/model/agenda-rows';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { AGENDA_ENTRY_ESTIMATE, IS_WEB, SCROLLBAR_GUTTER } from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CalendarAgendaViewProps = {
  entries: readonly CalendarEntry[];
  from: number;
  to: number;
  now: number;
  compact: boolean;
  continueLabel: string;
  onContinue: () => void;
  onSelect?: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
  onCreateDay?: (day: Date) => void;
  renderActions?: (entry: CalendarEntry) => ReactNode;
  renderContextMenu?: (entry: CalendarEntry, trigger: ReactElement) => ReactNode;
};

type DateBadgeProps = {
  day: number;
  isToday: boolean;
  compact: boolean;
};

const rowHover = Platform.select({ web: 'hover:bg-surface-secondary/70', default: '' });

function DateBadge({ day, isToday, compact }: DateBadgeProps) {
  const date = useDateFormatter();
  const value = new Date(day);
  return (
    <View
      className={cn(
        'items-center justify-center rounded-2xl',
        compact ? 'h-14 w-12' : 'h-16 w-14',
        isToday ? 'bg-interactive' : 'bg-transparent'
      )}>
      <Text
        variant="micro"
        className={cn(
          'font-semibold tracking-[0.8px] uppercase',
          isToday ? 'text-foreground-on-interactive/80' : 'text-muted-foreground'
        )}>
        {date.formatWeekdayShort(value).replace('.', '')}
      </Text>
      <Text
        variant={compact ? 'headline' : 'title'}
        className={cn('font-semibold', isToday ? 'text-foreground-on-interactive' : 'text-foreground')}>
        {date.formatDayNumber(value)}
      </Text>
    </View>
  );
}

export function CalendarAgendaView({
  entries,
  from,
  to,
  now,
  compact,
  continueLabel,
  onContinue,
  onSelect,
  onLongPress,
  onCreateDay,
  renderActions,
  renderContextMenu,
}: CalendarAgendaViewProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const bottomInset = useBottomNavInset();
  const today = date.startOfDay(new Date(now)).getTime();
  const rows = useMemo(() => agendaRows(entries, { from, to }, now, date), [date, entries, from, now, to]);

  const freeLabel = useCallback(
    (row: Extract<AgendaRow, { kind: 'free' }>) => {
      const first = new Date(row.from);
      const last = new Date(row.to);
      if (row.days === 1) return t('screens.agenda.free-range', { range: date.formatPickerDay(first) });
      return t('screens.agenda.free-range', { range: date.formatDayRange(first, last) });
    },
    [date, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: AgendaRow }) => {
      if (item.kind === 'month') {
        return (
          <View className="flex-row items-center gap-3 pt-5 pb-3">
            <Text variant="label" className="text-foreground-secondary font-semibold capitalize">
              {date.formatMonthYear(new Date(item.month))}
            </Text>
            <View className="bg-divider/40 h-hairline flex-1" />
          </View>
        );
      }

      if (item.kind === 'free') {
        const past = item.to < today;
        return (
          <View className={cn('flex-row items-center', compact ? 'gap-3 pb-2' : 'gap-4 pb-2.5')}>
            <View className={cn('items-center', compact ? 'w-12' : 'w-14')}>
              <View className="bg-divider/50 h-6 w-px" />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={freeLabel(item)}
              accessibilityHint={onCreateDay ? t('screens.agenda.add-here') : undefined}
              disabled={!onCreateDay}
              onPress={onCreateDay ? () => onCreateDay(new Date(item.from)) : undefined}
              className={cn(
                'group min-w-0 flex-1 flex-row items-center gap-2.5 rounded-xl px-3 py-2.5 active:opacity-70',
                rowHover
              )}>
              <Icon name="moon" className="text-muted-foreground size-3.5" />
              <Text
                variant="caption"
                numberOfLines={1}
                className={cn('min-w-0 flex-1', past ? 'text-muted-foreground' : 'text-foreground-secondary')}>
                {freeLabel(item)}
              </Text>
              {onCreateDay ? (
                <View className="web:opacity-0 web:group-hover:opacity-100 flex-row items-center gap-1">
                  <Icon name="plus" className="text-foreground-secondary size-3.5" />
                  {compact ? null : (
                    <Text variant="caption" className="text-foreground-secondary">
                      {t('screens.agenda.add-here')}
                    </Text>
                  )}
                </View>
              ) : null}
            </Pressable>
          </View>
        );
      }

      return (
        <View className={cn('flex-row items-start', compact ? 'gap-3 pb-3' : 'gap-4 pb-4')}>
          <DateBadge day={item.day} isToday={item.isToday} compact={compact} />
          <View className="min-w-0 flex-1 gap-2">
            {item.isToday ? (
              <Text variant="micro" className="text-accent-strong -mb-0.5 font-semibold tracking-[0.8px] uppercase">
                {t('screens.agenda.today')}
              </Text>
            ) : null}
            {item.entries.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={!onCreateDay}
                onPress={onCreateDay ? () => onCreateDay(new Date(item.day)) : undefined}
                className={cn(
                  'border-border min-h-12 flex-row items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 active:opacity-70',
                  rowHover
                )}>
                <Text variant="caption" className="text-foreground-secondary">
                  {t('screens.agenda.today-free')}
                </Text>
                {onCreateDay ? (
                  <View className="flex-row items-center gap-1">
                    <Icon name="plus" className="text-foreground-secondary size-3.5" />
                    <Text variant="caption" className="text-foreground-secondary">
                      {t('screens.agenda.add-here')}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            ) : (
              item.entries.map((entry) => (
                <AgendaEntryRow
                  key={entry.id}
                  entry={entry}
                  compact={compact}
                  onPress={onSelect ? () => onSelect(entry) : undefined}
                  onLongPress={onLongPress ? () => onLongPress(entry) : undefined}
                  actions={renderActions?.(entry)}
                  contextMenu={
                    renderContextMenu ? (trigger) => renderContextMenu(entry, trigger) : undefined
                  }
                />
              ))
            )}
          </View>
        </View>
      );
    },
    [compact, date, freeLabel, onCreateDay, onLongPress, onSelect, renderActions, renderContextMenu, t, today]
  );

  return (
    <LegendList
      data={rows}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      estimatedItemSize={AGENDA_ENTRY_ESTIMATE}
      getItemType={(item) => item.kind}
      contentContainerStyle={{ paddingTop: 4, paddingBottom: bottomInset, paddingRight: IS_WEB ? SCROLLBAR_GUTTER : 0 }}
      ListFooterComponent={
        <View className={cn('flex-row pt-2', compact ? 'pl-[60px]' : 'pl-[72px]')}>
          <Pressable
            accessibilityRole="button"
            onPress={onContinue}
            className={cn('flex-row items-center gap-1.5 rounded-full px-3 py-2 active:opacity-70', rowHover)}>
            <Text variant="caption" className="text-foreground-secondary font-semibold">
              {continueLabel}
            </Text>
            <Icon name="chevron-right" className="text-foreground-secondary size-4" />
          </Pressable>
        </View>
      }
      recycleItems
      showsVerticalScrollIndicator={false}
    />
  );
}
