import { useState } from 'react';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { AgendaItem, AgendaKind } from '@/features/agenda/model/agenda-items';
import {
  draftDirty,
  draftFrom,
  draftProblems,
  momentOf,
  newDraft,
  scopesOf,
} from '@/features/agenda/model/item-draft';
import type { DraftProblem, EditScope, ItemDraft } from '@/features/agenda/model/item-draft';
import { createItem, saveItem } from '@/features/agenda/services/item-commands';

export type NewInput = { kind: AgendaKind; day: number; project: string };

export type ItemForm = {
  open: boolean;
  draft: ItemDraft;
  editing: AgendaItem | null;
  scope: EditScope;
  scopes: readonly EditScope[];
  problems: readonly DraftProblem[];
  dirty: string | boolean;
  change: (patch: Partial<ItemDraft>) => void;
  setScope: (scope: EditScope) => void;
  startNew: (input: NewInput) => void;
  startEdit: (item: AgendaItem) => void;
  close: () => void;
  submit: () => void;
};

export function useItemForm(): ItemForm {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaItem | null>(null);
  const [start, setStart] = useState<ItemDraft>(() =>
    newDraft({ kind: 'reminder', day: Date.now(), at: Date.now(), project: '' }, date)
  );
  const [draft, setDraft] = useState(start);
  const [scope, setScope] = useState<EditScope>('one');
  const [tried, setTried] = useState(false);
  const problems = draftProblems(draft);

  const begin = (next: ItemDraft, item: AgendaItem | null) => {
    setStart(next);
    setDraft(next);
    setEditing(item);
    setScope('one');
    setTried(false);
    setOpen(true);
  };

  const startNew = ({ kind, day, project }: NewInput) => {
    const shown = new Date(day);
    const at = date.atInputTime(shown, date.defaultInputTime(shown)).getTime();
    begin(newDraft({ kind, day, at, project }, date), null);
  };

  const submit = () => {
    if (problems.length > 0) {
      setTried(true);
      return;
    }
    const moment = momentOf(draft, date);
    void (editing
      ? saveItem({ draft, moment, t, item: editing, scope })
      : createItem({ draft, moment, t }));
    setOpen(false);
  };

  return {
    open,
    draft,
    editing,
    scope,
    scopes: scopesOf(editing),
    problems: tried ? problems : [],
    dirty: open ? draftDirty(draft, start) : false,
    change: (patch) => setDraft((current) => ({ ...current, ...patch })),
    setScope,
    startNew,
    startEdit: (item) => begin(draftFrom(item, date), item),
    close: () => setOpen(false),
    submit,
  };
}
