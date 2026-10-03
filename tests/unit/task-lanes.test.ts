import { describe, expect, test } from 'bun:test';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import {
  groupTasksByLane,
  laneAtPosition,
  laneOf,
  statusForLane,
  upcomingTasks,
} from '@/features/projects/model/task-lanes';

const task = (id: string, status: string, priority = 'none', dueAt: number | null = null): IProjectTaskCacheRow => ({
  id,
  projectId: '1',
  title: `Task ${id}`,
  status,
  priority,
  dueAt,
});

describe('task lanes', () => {
  test('every status belongs to exactly one lane', () => {
    expect(['backlog', 'todo', 'doing', 'done', 'canceled'].map(laneOf)).toEqual([
      'open',
      'open',
      'doing',
      'finished',
      'finished',
    ]);
    expect(laneOf('archived')).toBeNull();
  });

  test('a lane lists its tasks by status order, then by priority', () => {
    const lanes = groupTasksByLane([
      task('1', 'backlog', 'urgent'),
      task('2', 'todo', 'low'),
      task('3', 'todo', 'urgent'),
      task('4', 'canceled'),
      task('5', 'done'),
    ]);
    expect(lanes.open.map((entry) => entry.id)).toEqual(['3', '2', '1']);
    expect(lanes.doing).toEqual([]);
    expect(lanes.finished.map((entry) => entry.id)).toEqual(['5', '4']);
  });

  test('dropping into a lane keeps a status the lane already holds', () => {
    expect(statusForLane('open', 'backlog')).toBe('backlog');
    expect(statusForLane('finished', 'canceled')).toBe('canceled');
    expect(statusForLane('doing', 'backlog')).toBe('doing');
    expect(statusForLane('finished', 'doing')).toBe('done');
    expect(statusForLane('open', 'done')).toBe('todo');
  });

  test('upcoming lists open dated tasks soonest first', () => {
    const upcoming = upcomingTasks(
      [task('1', 'todo', 'none', 300), task('2', 'done', 'none', 100), task('3', 'doing', 'none', 200), task('4', 'todo')],
      5,
    );
    expect(upcoming.map((entry) => entry.id)).toEqual(['3', '1']);
    expect(upcomingTasks([task('1', 'todo', 'none', 1), task('2', 'todo', 'none', 2)], 1)).toHaveLength(1);
  });

  test('a pointer position maps onto the lane under it, clamped to the board', () => {
    expect(laneAtPosition(150, 100, 200, 3)).toBe(0);
    expect(laneAtPosition(320, 100, 200, 3)).toBe(1);
    expect(laneAtPosition(900, 100, 200, 3)).toBe(2);
    expect(laneAtPosition(10, 100, 200, 3)).toBe(0);
    expect(laneAtPosition(150, 100, 0, 3)).toBe(-1);
  });
});
