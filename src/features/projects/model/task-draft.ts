import type {
  IProjectTaskCacheRow,
  IProjectTaskCreate,
  IProjectTaskUpdate,
} from '@/core/interfaces';
import type { ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
import { TASK_TITLE_MAX } from '@/features/projects/constants/projects.constant';
import { laneOf, statusForLane } from '@/features/projects/model/task-lanes';
import type { TaskLaneKey } from '@/features/projects/model/task-lanes';

export type TaskDraft = {
  title: string;
  project: string;
  lane: TaskLaneKey;
  due: number | null;
  priority: ProjectTaskPriority;
};

export type TaskProblem = 'title' | 'title-long' | 'project';

export type NewTaskInput = { project: string; lane: TaskLaneKey };

const toSeconds = (ms: number): number => Math.round(ms / 1000);

export const newTaskDraft = ({ project, lane }: NewTaskInput): TaskDraft => ({
  title: '',
  project,
  lane,
  due: null,
  priority: 'none',
});

export const taskDraftOf = (task: IProjectTaskCacheRow): TaskDraft => ({
  title: task.title,
  project: task.projectId,
  lane: laneOf(task.status),
  due: task.dueAt,
  priority: task.priority as ProjectTaskPriority,
});

export function taskProblems(draft: TaskDraft): TaskProblem[] {
  const title = draft.title.trim();
  const problems: TaskProblem[] = [];
  if (title === '') problems.push('title');
  else if (title.length > TASK_TITLE_MAX) problems.push('title-long');
  if (draft.project === '') problems.push('project');
  return problems;
}

export function taskDirty(draft: TaskDraft, start: TaskDraft): string | boolean {
  const changed = (Object.keys(draft) as (keyof TaskDraft)[]).some(
    (key) => draft[key] !== start[key]
  );
  if (!changed) return false;
  return draft.title.trim() || true;
}

export function taskCreateBody(draft: TaskDraft): IProjectTaskCreate {
  const body: IProjectTaskCreate = {
    projectId: Number(draft.project),
    title: draft.title.trim(),
    status: statusForLane(draft.lane, 'todo'),
    priority: draft.priority,
  };
  if (draft.due !== null) body.dueAt = toSeconds(draft.due);
  return body;
}

export function taskUpdateBody(draft: TaskDraft, task: IProjectTaskCacheRow): IProjectTaskUpdate {
  return {
    title: draft.title.trim(),
    status: statusForLane(draft.lane, task.status as ProjectTaskStatus),
    priority: draft.priority,
    dueAt: draft.due === null ? null : toSeconds(draft.due),
  };
}
