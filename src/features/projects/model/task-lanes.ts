import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { ProjectTaskStatus } from '@/core/types';
import { TASK_PRIORITY_WEIGHT, TASK_STATUS_ORDER } from '@/shared/constants';
import { isOpenTask } from '@/shared/libs/task-progress';

export type TaskLaneKey = 'open' | 'doing' | 'finished';

export type TaskLaneSpec = {
  key: TaskLaneKey;
  statuses: readonly ProjectTaskStatus[];
  createStatus: ProjectTaskStatus;
  toneClassName: string;
};

export const TASK_LANES: readonly TaskLaneSpec[] = [
  { key: 'open', statuses: ['todo', 'backlog'], createStatus: 'todo', toneClassName: 'bg-muted-foreground' },
  { key: 'doing', statuses: ['doing'], createStatus: 'doing', toneClassName: 'bg-accent' },
  { key: 'finished', statuses: ['done', 'canceled'], createStatus: 'done', toneClassName: 'bg-success' },
];

const statusRank = (status: string): number => TASK_STATUS_ORDER.indexOf(status as ProjectTaskStatus);

const priorityRank = (priority: string): number => TASK_PRIORITY_WEIGHT[priority] ?? 9;

export function laneOf(status: string): TaskLaneKey | null {
  return TASK_LANES.find((lane) => lane.statuses.includes(status as ProjectTaskStatus))?.key ?? null;
}

export function groupTasksByLane(
  tasks: readonly IProjectTaskCacheRow[],
): Record<TaskLaneKey, IProjectTaskCacheRow[]> {
  const lanes: Record<TaskLaneKey, IProjectTaskCacheRow[]> = { open: [], doing: [], finished: [] };
  for (const task of tasks) {
    const lane = laneOf(task.status);
    if (lane) lanes[lane].push(task);
  }
  for (const lane of Object.values(lanes)) {
    lane.sort(
      (left, right) =>
        statusRank(left.status) - statusRank(right.status) || priorityRank(left.priority) - priorityRank(right.priority),
    );
  }
  return lanes;
}

export function statusForLane(lane: TaskLaneKey, current: ProjectTaskStatus): ProjectTaskStatus {
  const spec = TASK_LANES.find((candidate) => candidate.key === lane);
  if (!spec || spec.statuses.includes(current)) return current;
  return spec.createStatus;
}

export function upcomingTasks(
  tasks: readonly IProjectTaskCacheRow[],
  limit: number,
): IProjectTaskCacheRow[] {
  return tasks
    .filter((task) => task.dueAt != null && isOpenTask(task))
    .sort((left, right) => (left.dueAt ?? 0) - (right.dueAt ?? 0))
    .slice(0, limit);
}

export function laneAtPosition(x: number, origin: number, span: number, lanes: number): number {
  'worklet';
  if (span <= 0 || lanes <= 0) return -1;
  return Math.min(lanes - 1, Math.max(0, Math.floor((x - origin) / span)));
}
