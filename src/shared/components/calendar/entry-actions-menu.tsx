import { useMemo } from 'react';
import { Pressable } from 'react-native';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { projectTaskService } from '@/core/services/project-task.service';
import type { CalendarEntry, MenuOption } from '@/core/types';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Icon } from '@/shared/components/ui/icon';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { toast } from '@/shared/libs/toast';

type EntryAction = 'edit' | 'delete' | 'toggle';

type EntryActionsMenuProps = {
  entry: CalendarEntry;
  /** Opens the edit form; only a calendar event has one. */
  onEdit?: (entry: CalendarEntry) => void;
  canEdit: boolean;
  canDelete: boolean;
};

/** Row id without the `source:` prefix the merged list carries. */
const rowId = (entry: CalendarEntry): string => entry.id.slice(entry.id.indexOf(':') + 1);

/**
 * Per-row actions on a schedule entry. Which ones exist depends on what the
 * entry is: an event is edited here, a task is closed here, and a reminder is
 * produced by Argus, so it only offers what the backend accepts.
 */
export function EntryActionsMenu({ entry, onEdit, canEdit, canDelete }: EntryActionsMenuProps) {
  const { t } = useTranslation();
  const isEvent = entry.source === 'event';
  const isTask = entry.source === 'task';

  const options = useMemo<MenuOption<EntryAction>[]>(() => {
    const list: MenuOption<EntryAction>[] = [];
    if (isEvent && canEdit && onEdit) {
      list.push({ value: 'edit', label: t('common.edit'), icon: 'pencil' });
    }
    if (isTask && canEdit) {
      list.push({
        value: 'toggle',
        label:
          entry.status === 'complete'
            ? t('screens.agenda.mark-pending')
            : t('screens.agenda.mark-done'),
        icon: 'check-circle',
      });
    }
    if ((isEvent || isTask) && canDelete) {
      list.push({ value: 'delete', label: t('common.delete'), icon: 'trash', destructive: true });
    }
    return list;
  }, [canDelete, canEdit, entry.status, isEvent, isTask, onEdit, t]);

  const run = async (action: EntryAction) => {
    if (action === 'edit') {
      onEdit?.(entry);
      return;
    }

    if (action === 'toggle') {
      const status = entry.status === 'complete' ? 'todo' : 'done';
      const result = await projectTaskService.update(rowId(entry), { status });
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
      ? await calendarEventService.remove(rowId(entry))
      : await projectTaskService.remove(rowId(entry));
    if (!result.ok) {
      toast.error(t('common.errors.unknown'), result.errors?.message);
      return;
    }
    toast.success(t('screens.agenda.deleted'));
  };

  if (options.length === 0) return null;

  return (
    <AdaptiveMenu
      options={options}
      onSelect={(action) => void run(action)}
      title={entry.title}
      closeLabel={t('common.close')}
      trigger={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.agenda.options')}
          hitSlop={10}
          className="active:opacity-60">
          <Icon name="more-horizontal" className="text-muted-foreground size-4" />
        </Pressable>
      }
    />
  );
}
