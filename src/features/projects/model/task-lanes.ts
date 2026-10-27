import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { ProjectTaskStatus } from '@/core/types';
import { TASK_PRIORITY_WEIGHT, TASK_STATUS_ORDER } from '@/shared/constants';
import { BOARD_MIN_WIDTH, TASK_LANES } from '@/features/projects/constants/projects.constant';

export type TaskLaneKey = 'todo' | 'doing' | 'done';

export type TaskLaneSpec = {
  key: TaskLaneKey;
  statuses: readonly ProjectTaskStatus[];
  status: ProjectTaskStatus;
};

export type TaskLanes = Record<TaskLaneKey, IProjectTaskCacheRow[]>;

const statusRank = (status: string): number =>
  TASK_STATUS_ORDER.indexOf(status as ProjectTaskStatus);

const priorityRank = (priority: string): number => TASK_PRIORITY_WEIGHT[priority] ?? 9;

const dueRank = (task: IProjectTaskCacheRow): number => task.dueAt ?? Number.POSITIVE_INFINITY;

const byLaneOrder = (left: IProjectTaskCacheRow, right: IProjectTaskCacheRow): number =>
  statusRank(left.status) - statusRank(right.status) ||
  priorityRank(left.priority) - priorityRank(right.priority) ||
  dueRank(left) - dueRank(right);

export function laneOf(status: string): TaskLaneKey {
  return (
    TASK_LANES.find((lane) => lane.statuses.includes(status as ProjectTaskStatus))?.key ?? 'todo'
  );
}

export function groupTasksByLane(tasks: readonly IProjectTaskCacheRow[]): TaskLanes {
  const lanes: TaskLanes = { todo: [], doing: [], done: [] };
  for (const task of tasks) lanes[laneOf(task.status)].push(task);
  lanes.todo.sort(byLaneOrder);
  lanes.doing.sort(byLaneOrder);
  return lanes;
}

export function projectTaskRows(
  open: readonly IProjectTaskCacheRow[],
  done: readonly IProjectTaskCacheRow[]
): IProjectTaskCacheRow[] {
  const seen = new Set(open.map((task) => task.id));
  return [...open, ...done.filter((task) => !seen.has(task.id))];
}

export function statusForLane(lane: TaskLaneKey, current: ProjectTaskStatus): ProjectTaskStatus {
  const spec = TASK_LANES.find((candidate) => candidate.key === lane);
  if (!spec || spec.statuses.includes(current)) return current;
  return spec.status;
}

export const toggledStatus = (status: ProjectTaskStatus): ProjectTaskStatus =>
  status === 'done' ? 'todo' : 'done';

export function laneAtPosition(x: number, origin: number, span: number, lanes: number): number {
  'worklet';
  if (span <= 0 || lanes <= 0) return -1;
  return Math.min(lanes - 1, Math.max(0, Math.floor((x - origin) / span)));
}

export type TaskLayout = 'board' | 'groups';

export const taskLayoutOf = (width: number): TaskLayout =>
  width >= BOARD_MIN_WIDTH ? 'board' : 'groups';
