import type { ProjectTaskStatus } from '@/core/types';

type TaskLike = { status: string };

export type TaskProgress = { done: number; total: number };

export function isOpenTask(task: TaskLike): boolean {
  const status = task.status as ProjectTaskStatus;
  return status !== 'done' && status !== 'canceled';
}

export function taskProgress(tasks: readonly TaskLike[]): TaskProgress {
  let done = 0;
  let total = 0;
  for (const task of tasks) {
    if (task.status === 'canceled') continue;
    total += 1;
    if (task.status === 'done') done += 1;
  }
  return { done, total };
}
