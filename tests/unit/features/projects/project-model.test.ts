import { describe, expect, test } from 'bun:test';
import type { IProjectCacheRow, IProjectTaskCacheRow } from '@/core/interfaces';
import type { TableName } from '@/core/types';
import type { Permission } from '@/shared/libs/role-access';
import { at, date, NOW, t } from '../home/agenda-fixtures';
import {
  NEW_PROJECT,
  projectBody,
  projectDirty,
  projectProblems,
} from '@/features/projects/model/project-draft';
import { projectMenu, projectRights } from '@/features/projects/model/project-rights';
import {
  peopleWords,
  progressFraction,
  progressWords,
  projectGroups,
  projectLine,
  taskCheck,
  taskWords,
} from '@/features/projects/model/project-words';
import {
  newTaskDraft,
  taskCreateBody,
  taskDirty,
  taskDraftOf,
  taskProblems,
  taskUpdateBody,
} from '@/features/projects/model/task-draft';

const task = (patch: Partial<IProjectTaskCacheRow> = {}): IProjectTaskCacheRow => ({
  id: '9',
  projectId: '7',
  title: 'Comprar cajas',
  status: 'todo',
  priority: 'none',
  dueAt: null,
  ...patch,
});

const project = (id: string, status: string): IProjectCacheRow => ({
  id,
  ownerId: '1',
  name: `Proyecto ${id}`,
  description: '',
  status,
});

const everything = (_table: TableName, _permission: Permission) => true;

const context = { now: NOW, date, t };

describe('project words', () => {
  test('a project reads «Ana, Luis · 3 de 8 hechas», and with no tasks never «0 de 0»', () => {
    const progress = { done: 3, total: 8 };
    expect(projectLine({ names: ['Ana Ruiz', 'Luis Paz'], progress, status: 'active' }, t)).toBe(
      'Ana, Luis · 3 de 8 hechas'
    );
    expect(projectLine({ names: [], progress: { done: 0, total: 0 }, status: 'active' }, t)).toBe(
      'Aún no hay tareas'
    );
    expect(projectLine({ names: [], progress, status: 'paused' }, t)).toBe(
      'En pausa · 3 de 8 hechas'
    );
    expect(progressWords({ done: 0, total: 0 }, t)).toBe('Aún no hay tareas');
    expect(progressFraction({ done: 0, total: 0 })).toBe(0);
    expect(progressFraction({ done: 2, total: 8 })).toBe(0.25);
  });

  test('more than two people collapse into a count', () => {
    expect(peopleWords(['Ana', 'Luis', 'Rosa', 'Pedro'], t)).toBe('Ana, Luis y 2 más');
    expect(peopleWords([' ', 'Ana'], t)).toBe('Ana');
  });

  test('a task says when it is due, late in red, and always carries a line', () => {
    expect(taskWords(task(), context)).toEqual({ meta: 'Sin fecha', alert: false });
    expect(taskWords(task({ dueAt: at(0) }), context).meta).toBe('Para hoy');
    const late = taskWords(task({ dueAt: at(0, 0, -2), priority: 'urgent' }), context);
    expect(late.alert).toBe(true);
    expect(late.meta).toContain('Atrasada');
    expect(late.meta).toContain('Urgente');
    expect(taskWords(task({ status: 'canceled' }), context).meta).toBe('Cancelada');
    expect(taskWords(task({ status: 'done', dueAt: at(0, 0, -2) }), context).alert).toBe(false);
  });

  test('a task Argus made says «por Argus» after its other words, and the app adds nothing', () => {
    expect(taskWords(task({ createdVia: 'assistant' }), context).meta).toBe(
      'Sin fecha · por Argus'
    );
    expect(taskWords(task({ createdVia: 'assistant', dueAt: at(0) }), context).meta).toBe(
      'Para hoy · por Argus'
    );
    expect(taskWords(task({ createdVia: 'app' }), context).meta).toBe('Sin fecha');
  });

  test('the check shows open, overdue, in progress and done', () => {
    const today = at(0);
    expect(taskCheck(task(), today)).toBe('open');
    expect(taskCheck(task({ dueAt: at(0, 0, -1) }), today)).toBe('overdue');
    expect(taskCheck(task({ status: 'doing' }), today)).toBe('progress');
    expect(taskCheck(task({ status: 'done' }), today)).toBe('done');
  });

  test('finished projects go below the ones in motion', () => {
    const groups = projectGroups([
      project('1', 'done'),
      project('2', 'active'),
      project('3', 'paused'),
    ]);
    expect(groups.open.map((entry) => entry.id)).toEqual(['2', '3']);
    expect(groups.closed.map((entry) => entry.id)).toEqual(['1']);
  });
});

describe('project rights', () => {
  test('a view-only member adds and edits nothing', () => {
    const rights = projectRights({
      access: 'view',
      can: everything,
      pending: false,
      directory: true,
    });
    expect(rights).toEqual({
      createTask: false,
      editTask: false,
      editProject: false,
      removeProject: false,
      members: false,
      viewOnly: true,
    });
    expect(projectMenu({ rights, ask: true })).toEqual(['ask']);
  });

  test('the owner gets Miembros and edit in the menu, an editor only edits', () => {
    const owner = projectRights({
      access: 'owner',
      can: everything,
      pending: false,
      directory: true,
    });
    expect(projectMenu({ rights: owner, ask: true })).toEqual(['members', 'edit', 'ask']);
    const editor = projectRights({
      access: 'edit',
      can: everything,
      pending: false,
      directory: true,
    });
    expect(editor.createTask && editor.editTask && !editor.members && !editor.removeProject).toBe(
      true
    );
    expect(projectMenu({ rights: editor, ask: false })).toEqual(['edit']);
  });

  test('a project still being saved and a missing permission hold everything back', () => {
    const pending = projectRights({
      access: 'owner',
      can: everything,
      pending: true,
      directory: true,
    });
    expect(pending.createTask || pending.editProject || pending.members).toBe(false);
    const none = projectRights({
      access: 'owner',
      can: () => false,
      pending: false,
      directory: false,
    });
    expect(none.createTask || none.editTask || none.members).toBe(false);
  });
});

describe('drafts', () => {
  test('a task needs a title and a project, and saves its lane, date and priority', () => {
    const draft = newTaskDraft({ project: '', lane: 'doing' });
    expect(taskProblems(draft)).toEqual(['title', 'project']);
    expect(taskProblems({ ...draft, project: '7', title: 'x'.repeat(161) })).toEqual([
      'title-long',
    ]);
    const ready = { ...draft, project: '7', title: ' Comprar cajas ', due: 2_000_000 };
    expect(taskDirty(ready, draft)).toBe('Comprar cajas');
    expect(taskDirty(draft, draft)).toBe(false);
    expect(taskCreateBody(ready)).toEqual({
      projectId: 7,
      title: 'Comprar cajas',
      status: 'doing',
      priority: 'none',
      dueAt: 2000,
    });
  });

  test('editing keeps a pending task pending and can clear its date', () => {
    const saved = task({ status: 'backlog', dueAt: 5_000 });
    const draft = { ...taskDraftOf(saved), due: null };
    expect(draft.lane).toBe('todo');
    expect(taskUpdateBody(draft, saved)).toEqual({
      title: 'Comprar cajas',
      status: 'backlog',
      priority: 'none',
      dueAt: null,
    });
    expect(taskUpdateBody({ ...draft, lane: 'done' }, saved).status).toBe('done');
  });

  test('a project needs a name and trims what it saves', () => {
    expect(projectProblems(NEW_PROJECT)).toEqual(['name']);
    const draft = { ...NEW_PROJECT, name: ' Mudanza ', description: ' Antes de fin de mes ' };
    expect(projectProblems(draft)).toEqual([]);
    expect(projectDirty(draft, NEW_PROJECT)).toBe('Mudanza');
    expect(projectBody(draft)).toEqual({
      name: 'Mudanza',
      description: 'Antes de fin de mes',
      status: 'active',
    });
  });
});
