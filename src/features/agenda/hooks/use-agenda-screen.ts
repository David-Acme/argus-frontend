import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { AgendaItem } from '@/core/types';
import { NEW_ITEM_PARAM } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { peopleAccessOf } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import { useAgendaPlan } from '@/features/agenda/hooks/use-agenda-plan';
import { useArgusDraft } from '@/features/agenda/hooks/use-argus-draft';
import type { AgendaPlan } from '@/features/agenda/hooks/use-agenda-plan';
import { useItemActions } from '@/features/agenda/hooks/use-item-actions';
import { useItemForm } from '@/features/agenda/hooks/use-item-form';
import type { ItemForm } from '@/features/agenda/hooks/use-item-form';
import { dayGroups, itemsOf, monthOf } from '@/features/agenda/model/agenda-days';
import { reminderQuestion, shownItems, toggleShown } from '@/features/agenda/model/agenda-lines';
import type { Category } from '@/features/agenda/model/agenda-lines';
import {
  calendarEntryEditHref,
  calendarEntryRecordId,
  canShareCalendarEntry,
} from '@/features/agenda/model/calendar-entry-actions';
import { ALL_SHOWN, LIST_DAYS } from '@/features/agenda/constants/agenda.constant';
import type { AgendaView, DetailHandlers, ListContext } from '@/features/agenda/model/agenda-view';
import type { ItemKind } from '@/features/agenda/model/item-draft';

type AgendaParams = { edit?: string; at?: string; new?: string };

const PROJECTS_HREF = '/projects';

function timestampParam(value: string | undefined): number | null {
  const at = Number(value);
  return Number.isFinite(at) && at > 0 ? at : null;
}

const editTarget = (items: readonly AgendaItem[], recordId: string): AgendaItem | undefined =>
  items.find(
    (item) =>
      item.origin.kind === 'entry' &&
      item.kind === 'event' &&
      calendarEntryRecordId(item.origin.entry) === recordId
  );

type DeepLinkInput = {
  params: AgendaParams;
  items: readonly AgendaItem[];
  kinds: readonly ItemKind[];
  form: ItemForm;
  create: (kind: ItemKind) => void;
};

function useCreateKinds(plan: AgendaPlan) {
  const { can } = useCapabilities();
  const project = plan.projects[0]?.id ?? '';
  const kinds: ItemKind[] = [
    ...(can('calendar_event', 'create') ? (['event'] as const) : []),
    ...(can('project_task', 'create') && project ? (['task'] as const) : []),
  ];
  return { kinds, project };
}

function useDeepLinks({ params, items, kinds, form, create }: DeepLinkInput): void {
  const [pendingNew, setPendingNew] = useState(params.new === NEW_ITEM_PARAM.event);
  const [pendingEdit, setPendingEdit] = useState(params.edit ?? '');
  if (pendingNew && kinds.includes('event')) {
    setPendingNew(false);
    create('event');
  }
  const editing = pendingEdit ? editTarget(items, pendingEdit) : undefined;
  if (editing) {
    setPendingEdit('');
    form.startEdit(editing);
  }
}

function useItemHandlers(plan: AgendaPlan, form: ItemForm, setPicked: (id: string | null) => void) {
  const router = useRouter();
  const capabilities = useCapabilities();
  const [sharing, setSharing] = useState<AgendaItem | null>(null);
  const edit = (item: AgendaItem) => {
    setPicked(null);
    if (item.origin.kind === 'entry' && item.kind === 'task') {
      const href = calendarEntryEditHref(item.origin.entry);
      if (href) router.push(href);
      return;
    }
    form.startEdit(item);
  };
  const shareable = (item: AgendaItem): boolean =>
    item.origin.kind === 'entry' &&
    canShareCalendarEntry(item.origin.entry, {
      userId: plan.viewer,
      canManageShares: peopleAccessOf(capabilities).receivesDirectory,
    });
  return {
    sharing,
    stopSharing: () => setSharing(null),
    handlersFor: (item: AgendaItem): DetailHandlers => ({
      onEdit: edit,
      onShare: shareable(item) ? setSharing : undefined,
    }),
    openProjects:
      routeFallback(PROJECTS_HREF, capabilities) === null
        ? () => router.push(PROJECTS_HREF)
        : undefined,
  };
}

export function useAgendaScreen() {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const params = useLocalSearchParams<AgendaParams>();
  const [selected, setSelected] = useState(() =>
    date.startOfDay(new Date(timestampParam(params.at) ?? Date.now())).getTime()
  );
  const [month, setMonth] = useState(() => monthOf(selected));
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<AgendaView>('agenda');
  const [shown, setShown] = useState<ReadonlySet<Category>>(ALL_SHOWN);
  const [picked, setPicked] = useState<string | null>(null);
  const plan = useAgendaPlan(selected);
  const actions = useItemActions();
  const ask = useArgusDraft();
  const form = useItemForm();
  const { kinds, project } = useCreateKinds(plan);
  const create = (kind: ItemKind) => form.startNew({ kind, day: selected, project });
  useDeepLinks({ params, items: plan.items, kinds, form, create });
  const items = useItemHandlers(plan, form, setPicked);
  const visible = shownItems(plan.items, shown, plan.viewer);
  const groups = dayGroups(
    { items: visible, from: selected, days: LIST_DAYS, now: plan.now },
    date
  );
  const chosen = visible.find((item) => item.id === picked) ?? null;
  const context: ListContext = {
    now: plan.now,
    viewer: plan.viewer,
    owners: plan.owners,
    date,
    t,
    actions,
    selected: chosen?.id ?? null,
    onOpen: (item) =>
      item.kind === 'reminder' ? ask?.(reminderQuestion(item, t)) : setPicked(item.id),
  };
  return {
    ...items,
    plan,
    form,
    kinds,
    create,
    view,
    setView,
    selected,
    month,
    setMonth,
    expanded,
    toggleMonth: () => setExpanded(!expanded),
    shown,
    toggleShown: (category: Category) => setShown(toggleShown(shown, category)),
    visible,
    groups,
    first: (groups[0] ? itemsOf(groups[0])[0] : undefined) ?? null,
    chosen,
    context,
    close: () => setPicked(null),
    pick: (at: number) => {
      setSelected(at);
      setMonth(monthOf(at));
      setPicked(null);
    },
  };
}

export type AgendaScreenState = ReturnType<typeof useAgendaScreen>;
