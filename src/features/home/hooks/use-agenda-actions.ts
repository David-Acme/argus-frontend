import { useRouter } from 'expo-router';
import { useRef } from 'react';
import type { AgendaItem, AgendaMenuAction, AgendaRights } from '@/core/types';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { feedback } from '@/shared/theme';
import {
  agendaMenu,
  agendaRights,
  calendarEntryEditHref,
  reminderQuestion,
  removeEntry,
  toggleTask,
} from '@/features/agenda';
import { useAskArgus } from '@/features/home/hooks/use-ask-argus';

export type AgendaActions = {
  rightsOf: (item: AgendaItem) => AgendaRights;
  menuOf: (item: AgendaItem) => AgendaMenuAction[];
  toggle: (item: AgendaItem) => void;
  open: (item: AgendaItem) => void;
  run: (item: AgendaItem, action: AgendaMenuAction) => void;
};

export function useAgendaActions(): AgendaActions {
  const { t } = useTranslation();
  const router = useRouter();
  const { can } = useCapabilities();
  const ask = useAskArgus();
  const flying = useRef(new Set<string>());

  const rightsOf = (item: AgendaItem) => agendaRights(item, can);

  const once = (item: AgendaItem, action: () => Promise<unknown>) => {
    if (flying.current.has(item.id)) return false;
    flying.current.add(item.id);
    void action()
      .catch(() => undefined)
      .finally(() => flying.current.delete(item.id));
    return true;
  };

  const toggle = (item: AgendaItem) => {
    const { origin } = item;
    if (origin.kind === 'reminder') return;
    const started = once(item, () => toggleTask({ entry: origin.entry, t }));
    if (started && !item.done) feedback('success');
  };

  const open = (item: AgendaItem) => {
    const { origin } = item;
    if (origin.kind === 'reminder') {
      ask?.(reminderQuestion(item, t));
      return;
    }
    router.push(calendarEntryEditHref(origin.entry) ?? '/agenda');
  };

  const run = (item: AgendaItem, action: AgendaMenuAction) => {
    const { origin } = item;
    if (action === 'edit') open(item);
    else if (origin.kind === 'entry') once(item, () => removeEntry({ entry: origin.entry, t }));
  };

  return { rightsOf, menuOf: (item) => agendaMenu(rightsOf(item)), toggle, open, run };
}
