import type { TableName } from '@/core/types';
import { isOverdue } from '@/features/agenda/model/agenda-items';
import type { AgendaItem } from '@/features/agenda/model/agenda-items';

export type AgendaMenuAction = 'snooze-hour' | 'snooze-tomorrow' | 'edit' | 'delete';

export type AgendaCheck = 'open' | 'overdue' | 'progress' | 'done';

export type AgendaRights = { toggle: boolean; edit: boolean; remove: boolean };

export type RightsInput = {
  writesReminders: boolean;
  can: (table: TableName, permission: 'update' | 'delete') => boolean;
};

export type MenuInput = {
  item: AgendaItem;
  rights: AgendaRights;
  snoozes: readonly string[];
};

const SNOOZE_HOUR = '60';

const SNOOZE_TOMORROW = 'tomorrow';

export function agendaRights(
  item: AgendaItem,
  { writesReminders, can }: RightsInput
): AgendaRights {
  if (item.kind === 'reminder') {
    return { toggle: writesReminders, edit: writesReminders, remove: writesReminders };
  }
  const table = item.kind === 'task' ? 'project_task' : 'calendar_event';
  const edit = can(table, 'update');
  return { toggle: item.kind === 'task' && edit, edit, remove: can(table, 'delete') };
}

export function agendaMenu({ item, rights, snoozes }: MenuInput): AgendaMenuAction[] {
  const actions: AgendaMenuAction[] = [];
  if (item.kind === 'reminder' && !item.done && rights.edit) {
    if (snoozes.includes(SNOOZE_HOUR)) actions.push('snooze-hour');
    if (snoozes.includes(SNOOZE_TOMORROW)) actions.push('snooze-tomorrow');
  }
  if (rights.edit) actions.push('edit');
  if (rights.remove) actions.push('delete');
  return actions;
}

export function agendaCheck(item: AgendaItem, now: number): AgendaCheck {
  if (item.done) return 'done';
  if (isOverdue(item, now)) return 'overdue';
  return item.started ? 'progress' : 'open';
}
