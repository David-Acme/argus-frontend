import { describe, expect, test } from 'bun:test';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import {
  groupTasksByLane,
  laneAtPosition,
  laneOf,
  projectTaskRows,
  statusForLane,
  taskLayoutOf,
  toggledStatus,
} from '@/features/projects/model/task-lanes';

const task = (
  id: string,
  status: string,
  priority = 'none',
  dueAt: number | null = null
): IProjectTaskCacheRow => ({ id, projectId: '1', title: `Task ${id}`, status, priority, dueAt });

describe('task lanes', () => {
  test('every status belongs to Por hacer, En curso or Hechas, and an unknown one is to do', () => {
    expect(['backlog', 'todo', 'doing', 'done', 'canceled', 'archived'].map(laneOf)).toEqual([
      'todo',
      'todo',
      'doing',
      'done',
      'done',
      'todo',
    ]);
  });

  test('an open lane lists its tasks by status, then priority, then the nearest date; Terminadas keeps the database order', () => {
    const lanes = groupTasksByLane([
      task('1', 'backlog', 'urgent'),
      task('2', 'todo', 'low', 200),
      task('6', 'todo', 'low', 100),
      task('3', 'todo', 'urgent'),
      task('4', 'canceled'),
      task('5', 'done'),
    ]);
    expect(lanes.todo.map((entry) => entry.id)).toEqual(['3', '6', '2', '1']);
    expect(lanes.doing).toEqual([]);
    expect(lanes.done.map((entry) => entry.id)).toEqual(['4', '5']);
  });

  test('open tasks come first and a finished page never repeats a task the open query still holds', () => {
    const rows = projectTaskRows(
      [task('1', 'todo'), task('2', 'doing')],
      [task('2', 'done'), task('3', 'done')]
    );
    expect(rows.map((entry) => `${entry.id}:${entry.status}`)).toEqual([
      '1:todo',
      '2:doing',
      '3:done',
    ]);
  });

  test('moving into a lane keeps a status the lane already holds', () => {
    expect(statusForLane('todo', 'backlog')).toBe('backlog');
    expect(statusForLane('done', 'canceled')).toBe('canceled');
    expect(statusForLane('doing', 'backlog')).toBe('doing');
    expect(statusForLane('done', 'doing')).toBe('done');
    expect(statusForLane('todo', 'done')).toBe('todo');
  });

  test('the check finishes an open task and reopens a done one', () => {
    expect(toggledStatus('todo')).toBe('done');
    expect(toggledStatus('doing')).toBe('done');
    expect(toggledStatus('done')).toBe('todo');
  });

  test('the board needs a wide window, the grouped list serves the rest', () => {
    expect(taskLayoutOf(360)).toBe('groups');
    expect(taskLayoutOf(1024)).toBe('groups');
    expect(taskLayoutOf(1280)).toBe('board');
  });

  test('a pointer position maps onto the lane under it, clamped to the board', () => {
    expect(laneAtPosition(150, 100, 200, 3)).toBe(0);
    expect(laneAtPosition(320, 100, 200, 3)).toBe(1);
    expect(laneAtPosition(900, 100, 200, 3)).toBe(2);
    expect(laneAtPosition(10, 100, 200, 3)).toBe(0);
    expect(laneAtPosition(150, 100, 0, 3)).toBe(-1);
  });
});
