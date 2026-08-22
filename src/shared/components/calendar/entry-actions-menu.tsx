import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { projectTaskService } from '@/core/services/project-task.service';
import type { CalendarEntry, MenuOption } from '@/core/types';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Icon } from '@/shared/components/ui/icon';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { shouldUseAdaptiveMenuSheet } from '@/shared/libs/adaptive-menu-layout';
import {
  availableCalendarEntryActions,
  calendarEntryRecordId,
  shouldShowCalendarEntryOverflow,
  type CalendarEntryAction,
} from '@/shared/libs/calendar-entry-actions';
import { confirm } from '@/shared/libs/confirm';
import { toast } from '@/shared/libs/toast';

type EntryActionsMenuProps = {
  entry: CalendarEntry;
  /** Opens the edit form; only a calendar event has one. */
  onEdit?: (entry: CalendarEntry) => void;
  canEdit: boolean;
  canDelete: boolean;
  /** Mobile long press controls the sheet from the parent entry surface. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Per-row actions on a schedule entry. Which ones exist depends on what the
 * entry is: an event is edited here, a task is closed here, and a reminder is
 * produced by Argus, so it only offers what the backend accepts.
 */
export function EntryActionsMenu({
  entry,
  onEdit,
  canEdit,
  canDelete,
  open,
  onOpenChange,
}: EntryActionsMenuProps) {
  const { t } = useTranslation();
  const { isCompact, isExpanded, isShort } = useWindowClass();
  const usesSheet = shouldUseAdaptiveMenuSheet({
    isCompact,
    isExpanded,
    isNative: IS_NATIVE,
    isShort,
  });
  const isEvent = entry.source === 'event';

  const options = useMemo<MenuOption<CalendarEntryAction>[]>(() => {
    const list: MenuOption<CalendarEntryAction>[] = [];
    for (const action of availableCalendarEntryActions(entry, { canEdit, canDelete })) {
      if (action === 'edit' && onEdit) {
        list.push({ value: action, label: t('common.edit'), icon: 'pencil' });
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
        list.push({ value: action, label: t('common.delete'), icon: 'trash', destructive: true });
      }
    }
    return list;
  }, [canDelete, canEdit, entry, onEdit, t]);

  const run = async (action: CalendarEntryAction) => {
    if (action === 'edit') {
      onEdit?.(entry);
      return;
    }

    if (action === 'toggle') {
      const status = entry.status === 'complete' ? 'todo' : 'done';
      const result = await projectTaskService.update(calendarEntryRecordId(entry), { status });
      if (!result.ok) {
        toast.error(t('common.errors.unknown'), result.errors?.message);
        return;
      }
      toast.success(t('screens.agenda.updated'));
      return;
    }

    const accepted = await confirm({
      title: t('screens.agenda.delete-title'),
      description: t('screens.agenda.delete-description', { title: entry.title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      intent: 'danger',
    });
    if (!accepted) return;

    const result = isEvent
      ? await calendarEventService.remove(calendarEntryRecordId(entry))
      : await projectTaskService.remove(calendarEntryRecordId(entry));
    if (!result.ok) {
      toast.error(t('common.errors.unknown'), result.errors?.message);
      return;
    }
    toast.success(t('screens.agenda.deleted'));
  };

  if (options.length === 0) return null;
  // Touch surfaces use long press. The visible overflow is reserved for web,
  // where it is a predictable pointer affordance.
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
