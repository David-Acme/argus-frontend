import type { AgendaItem, AgendaMenuAction, AgendaRights, TableName } from '@/core/types';
import { isOverdue } from '@/features/agenda/model/agenda-items';

export type AgendaCheck = 'open' | 'overdue' | 'progress' | 'done';

export type Can = (table: TableName, permission: 'update' | 'delete') => boolean;

export function agendaRights(item: AgendaItem, can: Can): AgendaRights {
  const table = item.kind === 'task' ? 'project_task' : 'calendar_event';
  const edit = can(table, 'update');
  return { toggle: item.kind === 'task' && edit, edit, remove: can(table, 'delete') };
}

export function agendaMenu(rights: AgendaRights): AgendaMenuAction[] {
  const actions: AgendaMenuAction[] = [];
  if (rights.edit) actions.push('edit');
  if (rights.remove) actions.push('delete');
  return actions;
}

export function agendaCheck(item: AgendaItem, now: number): AgendaCheck {
  if (item.done) return 'done';
  if (isOverdue(item, now)) return 'overdue';
  return item.started ? 'progress' : 'open';
}
