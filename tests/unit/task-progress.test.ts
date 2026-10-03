import { describe, expect, test } from 'bun:test';
import { isOpenTask, taskProgress } from '@/shared/libs/task-progress';

describe('taskProgress', () => {
  test('a cancelled task counts neither as done nor toward the total', () => {
    expect(
      taskProgress([{ status: 'done' }, { status: 'done' }, { status: 'canceled' }, { status: 'todo' }])
    ).toEqual({ done: 2, total: 3 });
  });

  test('a project with only cancelled tasks has nothing left to do', () => {
    expect(taskProgress([{ status: 'canceled' }])).toEqual({ done: 0, total: 0 });
  });
});

describe('isOpenTask', () => {
  test('done and cancelled tasks are closed, every other status is open', () => {
    expect(['backlog', 'todo', 'doing', 'done', 'canceled'].map((status) => isOpenTask({ status }))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});
