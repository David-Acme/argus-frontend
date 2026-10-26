import { useMemo } from 'react';
import type { ICalendarEventShareCacheRow, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { calendarEventShareService } from '@/core/services/calendar-event-share.service';
import type { ShareAccess } from '@/core/types';
import { ShareMembersDialog } from '@/shared/components/sharing/share-members-dialog';
import type { ShareDialogLabels } from '@/shared/components/sharing/share-members-dialog';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { personFullName, shareCandidates } from '@/shared/libs/sharing';
import { calendarShareLens } from '@/features/agenda/model/calendar-share-optimistic';

type CalendarEventShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  ownerId: string;
};

export function CalendarEventShareDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  ownerId,
}: CalendarEventShareDialogProps) {
  const { t } = useTranslation();
  const shares = useViewCacheRows<ICalendarEventShareCacheRow>(
    VIEW_CACHE_KEYS.calendarEventShares,
    eventId
  );
  const people = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const lenses = useMemo(() => [calendarShareLens(eventId, people)], [eventId, people]);
  const merged = useOptimisticRows(shares, lenses);
  const candidates = shareCandidates({
    table: 'calendar_event',
    ownerId,
    shared: merged.rows,
    people,
  }).map((person) => ({ id: person.id, name: personFullName(person) }));
  const labels: ShareDialogLabels = {
    title: t('screens.agenda.share-title', { title: eventTitle }),
    empty: t('screens.agenda.share-empty'),
    addTitle: t('screens.agenda.share-add'),
    addPlaceholder: t('screens.agenda.share-add-placeholder'),
    addConfirm: t('screens.agenda.share-add-confirm'),
    noneLeft: t('screens.agenda.share-none-left'),
    newAccess: t('screens.agenda.share-new-access'),
    accessView: t('screens.agenda.share-access-view'),
    accessEdit: t('screens.agenda.share-access-edit'),
    rowAccess: (name) => t('screens.agenda.share-access', { name }),
    removeRow: (name) => t('screens.agenda.share-remove', { name }),
    close: t('common.close'),
    search: t('common.search'),
    noResults: t('screens.agenda.no-results'),
  };

  const add = (userId: string, access: ShareAccess) => {
    void runOptimistic({
      intents: [
        {
          table: 'calendar_event_share',
          kind: 'create',
          values: { calendarEventId: Number(eventId), userId: Number(userId), access },
        },
      ],
      call: () => calendarEventShareService.add(eventId, userId, access),
      success: t('screens.agenda.share-added'),
    });
  };

  const changeAccess = (row: ICalendarEventShareCacheRow, next: ShareAccess) => {
    void runOptimistic({
      intents: [
        {
          table: 'calendar_event_share',
          kind: 'update',
          recordId: row.id,
          values: { access: next },
        },
      ],
      call: () => calendarEventShareService.setAccess(row.id, next),
      success: t('screens.agenda.share-saved'),
    });
  };

  const remove = (row: ICalendarEventShareCacheRow) => {
    void runOptimistic({
      intents: [{ table: 'calendar_event_share', kind: 'delete', recordId: row.id }],
      confirm: {
        title: labels.removeRow(row.name),
        description: t('screens.agenda.share-remove-body', { title: eventTitle }),
        confirmLabel: t('common.confirm-delete'),
        intent: 'danger',
      },
      call: () => calendarEventShareService.remove(row.id),
      success: t('screens.agenda.share-removed'),
    });
  };

  return (
    <ShareMembersDialog
      open={open}
      onOpenChange={onOpenChange}
      labels={labels}
      rows={merged.rows}
      isPending={merged.isPending}
      candidates={candidates}
      onAdd={add}
      onChangeAccess={changeAccess}
      onRemove={remove}
    />
  );
}
