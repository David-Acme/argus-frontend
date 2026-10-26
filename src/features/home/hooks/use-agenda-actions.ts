import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import type { IReminderCacheRow } from '@/core/interfaces';
import type { AgendaItem, AgendaMenuAction, AgendaRights } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { feedback } from '@/shared/theme';
import {
  agendaMenu,
  agendaRights,
  calendarEntryEditHref,
  removeEntry,
  toggleTask,
} from '@/features/agenda';
import type { useReminders } from '@/features/agenda';

export type AgendaActions = {
  rightsOf: (item: AgendaItem) => AgendaRights;
  menuOf: (item: AgendaItem, now: number) => AgendaMenuAction[];
  toggle: (item: AgendaItem) => void;
  open: (item: AgendaItem) => void;
  run: (item: AgendaItem, action: AgendaMenuAction) => void;
  editing: IReminderCacheRow | null;
  closeEditing: () => void;
};

type Reminders = ReturnType<typeof useReminders>;

export function useAgendaActions(reminders: Reminders): AgendaActions {
  const { t } = useTranslation();
  const router = useRouter();
  const { has, can } = useCapabilities();
  const [editing, setEditing] = useState<IReminderCacheRow | null>(null);
  const flying = useRef(new Set<string>());
  const writesReminders = has(CAPABILITY.remindersWrite);

  const rightsOf = (item: AgendaItem) => agendaRights(item, { writesReminders, can });

  const once = (item: AgendaItem, action: () => Promise<unknown>) => {
    if (flying.current.has(item.id)) return false;
    flying.current.add(item.id);
    void action()
      .catch(() => undefined)
      .finally(() => flying.current.delete(item.id));
    return true;
  };

  const menuOf = (item: AgendaItem, now: number) => {
    const { origin } = item;
    const snoozes =
      origin.kind === 'reminder'
        ? reminders.snoozeOptionsOf(origin.row, now).map((option) => option.choice)
        : [];
    return agendaMenu({ item, rights: rightsOf(item), snoozes });
  };

  const toggle = (item: AgendaItem) => {
    const { origin } = item;
    const started = once(item, () =>
      origin.kind === 'reminder'
        ? reminders.complete(origin.row, !origin.row.isCompleted)
        : toggleTask({ entry: origin.entry, t })
    );
    if (started && !item.done) feedback('success');
  };

  const open = (item: AgendaItem) => {
    const { origin } = item;
    if (origin.kind === 'reminder') {
      if (rightsOf(item).edit) setEditing(origin.row);
      return;
    }
    router.push(calendarEntryEditHref(origin.entry) ?? '/agenda');
  };

  const remove = (item: AgendaItem) => {
    const { origin } = item;
    once(item, () =>
      origin.kind === 'reminder'
        ? reminders.remove(origin.row)
        : removeEntry({ entry: origin.entry, t })
    );
  };

  const run = (item: AgendaItem, action: AgendaMenuAction) => {
    const { origin } = item;
    if (action === 'edit') open(item);
    else if (action === 'delete') remove(item);
    else if (origin.kind === 'reminder')
      once(item, () => reminders.snooze(origin.row, action === 'snooze-hour' ? '60' : 'tomorrow'));
  };

  return {
    rightsOf,
    menuOf,
    toggle,
    open,
    run,
    editing,
    closeEditing: () => setEditing(null),
  };
}
