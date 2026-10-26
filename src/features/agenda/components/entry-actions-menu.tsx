import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { calendarEventService } from '@/core/services/calendar-event.service';
import type { CalendarEntry, MenuOption } from '@/core/types';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { shouldUseAdaptiveMenuSheet } from '@/shared/libs/adaptive-menu-layout';
import { cn } from '@/shared/libs/utils';
import { isPendingRecordId } from '@/shared/libs/optimistic';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import {
  availableCalendarEntryActions,
  calendarEntryRecordId,
  isOccurrence,
  occurrenceOf,
  shouldShowCalendarEntryOverflow,
  skipOccurrenceBody,
} from '@/features/agenda/model/calendar-entry-actions';
import type { CalendarEntryAction } from '@/features/agenda/model/calendar-entry-actions';
import { removeEntry, toggleTask } from '@/features/agenda/services/calendar-entry-commands';

type EntryActionsMenuProps = {
  entry: CalendarEntry;
  onEdit?: (entry: CalendarEntry) => void;
  onEditOccurrence?: (entry: CalendarEntry) => void;
  onShare?: (entry: CalendarEntry) => void;
  canEdit: boolean;
  canDelete: boolean;
  canShare?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contextTrigger?: ReactElement;
};

export function EntryActionsMenu({
  entry,
  onEdit,
  onEditOccurrence,
  onShare,
  canEdit,
  canDelete,
  canShare = false,
  open,
  onOpenChange,
  contextTrigger,
}: EntryActionsMenuProps) {
  const { t } = useTranslation();
  const { isCompact, isExpanded, isShort } = useWindowClass();
  const usesSheet = shouldUseAdaptiveMenuSheet({
    isCompact,
    isExpanded,
    isNative: IS_NATIVE,
    isShort,
  });
  const usesContextMenu = IS_NATIVE && !usesSheet;
  const series = isOccurrence(entry);
  const recordId = calendarEntryRecordId(entry);
  const pending = isPendingRecordId(recordId);

  const options = ((): MenuOption<CalendarEntryAction>[] => {
    const list: MenuOption<CalendarEntryAction>[] = [];
    if (pending) return list;
    for (const action of availableCalendarEntryActions(entry, { canEdit, canDelete, canShare })) {
      if (action === 'edit-occurrence' && onEditOccurrence) {
        list.push({
          value: action,
          label: t('screens.agenda.edit-occurrence'),
          description: t('screens.agenda.applies-to-occurrence'),
          icon: 'calendar-clock',
        });
      }
      if (action === 'skip-occurrence') {
        list.push({
          value: action,
          label: t('screens.agenda.skip-occurrence'),
          description: t('screens.agenda.applies-to-occurrence'),
          icon: 'calendar-x',
        });
      }
      if (action === 'edit' && onEdit) {
        list.push({
          value: action,
          label: series ? t('screens.agenda.edit-series') : t('common.edit'),
          description: series ? t('screens.agenda.applies-to-series') : undefined,
          icon: 'pencil',
        });
      }
      if (action === 'share' && onShare) {
        list.push({ value: action, label: t('screens.agenda.share'), icon: 'users' });
      }
      if (action === 'toggle') {
        list.push({
          value: action,
          label:
            entry.status === 'complete'
              ? t('screens.agenda.mark-pending')
              : t('screens.agenda.mark-done'),
          icon: 'check-circle',
        });
      }
      if (action === 'delete') {
        list.push({
          value: action,
          label: series ? t('screens.agenda.delete-series') : t('common.delete'),
          description: series ? t('screens.agenda.applies-to-series') : undefined,
          icon: 'trash',
          destructive: true,
        });
      }
    }
    return list;
  })();

  const run = async (action: CalendarEntryAction) => {
    if (action === 'edit') {
      onEdit?.(entry);
      return;
    }
    if (action === 'edit-occurrence') {
      onEditOccurrence?.(entry);
      return;
    }
    if (action === 'skip-occurrence') {
      const occurrence = occurrenceOf(entry);
      if (occurrence === null) return;
      const body = skipOccurrenceBody(occurrence);
      await runOptimistic({
        intents: [{ table: 'calendar_event', kind: 'update', recordId, values: body }],
        call: () => calendarEventService.changeOccurrence(recordId, body),
        undo: { title: t('screens.agenda.occurrence-skipped'), description: entry.title },
        errorTitle: t('screens.agenda.occurrence-failed'),
      });
      return;
    }
    if (action === 'share') {
      onShare?.(entry);
      return;
    }

    if (action === 'toggle') {
      await toggleTask({ entry, t });
      return;
    }

    await removeEntry({ entry, t });
  };

  if (options.length === 0) return contextTrigger ?? null;

  if (contextTrigger) {
    if (!usesContextMenu) return contextTrigger;

    return (
      <ContextMenu className="min-w-0 flex-1">
        <ContextMenuTrigger asChild>{contextTrigger}</ContextMenuTrigger>
        <ContextMenuContent
          insets={{ top: 16, right: 16, bottom: 16, left: 16 }}
          sideOffset={8}
          className="bg-card min-w-48 rounded-2xl p-1.5 shadow-lg shadow-black/15">
          {options.map((option, index) => (
            <View key={option.value}>
              {option.destructive && index > 0 ? <ContextMenuSeparator /> : null}
              <ContextMenuItem
                textValue={option.label}
                disabled={option.disabled}
                onPress={() => void run(option.value)}
                className={cn(
                  'min-h-12 flex-row items-center gap-3 rounded-md px-3 py-2.5 active:opacity-70',
                  option.destructive && 'active:bg-error/10'
                )}>
                {option.icon ? (
                  <Icon
                    name={option.icon}
                    className={cn(
                      'size-5',
                      option.destructive ? 'text-error-strong' : 'text-foreground-secondary'
                    )}
                  />
                ) : null}
                <Text
                  className={cn(
                    'text-legacy-body font-medium',
                    option.destructive ? 'text-error-strong' : 'text-foreground'
                  )}>
                  {option.label}
                </Text>
              </ContextMenuItem>
            </View>
          ))}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  if (open === undefined && !shouldShowCalendarEntryOverflow(IS_NATIVE)) return null;
  if (open !== undefined && !usesSheet) return null;

  return (
    <AdaptiveMenu
      options={options}
      onSelect={(action) => void run(action)}
      title={entry.title}
      closeLabel={t('common.close')}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        open !== undefined ? (
          <View />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('screens.agenda.options')}
            hitSlop={10}
            className="active:opacity-60">
            <Icon name="more-horizontal" className="text-muted-foreground size-4" />
          </Pressable>
        )
      }
    />
  );
}
