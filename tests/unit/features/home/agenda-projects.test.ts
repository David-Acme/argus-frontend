import { describe, expect, test } from 'bun:test';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { DashboardProjectCard } from '@/core/types';
import { nextTask, openProjects, projectMeta } from '@/features/home/model/agenda-projects';
import { at, t } from './agenda-fixtures';

const card = (id: string, extra: Partial<DashboardProjectCard> = {}): DashboardProjectCard => ({
  id,
  name: id,
  description: '',
  status: 'active',
  done: 0,
  total: 0,
  progress: 0,
  ...extra,
});

const task = (title: string, extra: Partial<IProjectTaskCacheRow> = {}): IProjectTaskCacheRow => ({
  id: title,
  projectId: 'p',
  title,
  status: 'todo',
  priority: 'none',
  dueAt: null,
  ...extra,
});

describe('the Proyectos rows', () => {
  test('done and canceled projects leave, the rest keep their order up to the limit', () => {
    const cards = [
      card('a'),
      card('b', { status: 'done' }),
      card('c', { status: 'canceled' }),
      card('d'),
      card('e'),
    ];
    expect(openProjects(cards, 2).map((project) => project.id)).toEqual(['a', 'd']);
  });

  test('the next task is the open one due first, then the most urgent', () => {
    expect(
      nextTask([
        task('hecha', { status: 'done', dueAt: at(9) }),
        task('sin fecha', { priority: 'urgent' }),
        task('Comprar cajas', { dueAt: at(10, 0, 1) }),
        task('Embalar', { dueAt: at(10, 0, 2) }),
      ])?.title
    ).toBe('Comprar cajas');
    expect(
      nextTask([task('baja', { priority: 'low' }), task('alta', { priority: 'high' })])?.title
    ).toBe('alta');
    expect(nextTask([task('hecha', { status: 'done' })])).toBeNull();
  });

  test('the meta reads «3 de 8 hechas · próxima: …», or says there are no tasks yet', () => {
    expect(projectMeta({ done: 3, total: 8 }, { title: 'Comprar cajas' }, t)).toBe(
      '3 de 8 hechas · próxima: Comprar cajas'
    );
    expect(projectMeta({ done: 1, total: 4 }, null, t)).toBe('1 de 4 hechas');
    expect(projectMeta({ done: 0, total: 0 }, null, t)).toBe('Aún no hay tareas');
  });
});
