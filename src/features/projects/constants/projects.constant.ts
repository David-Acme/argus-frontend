import type {
  ProjectStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
  TranslationKey,
} from '@/core/types';
import type { TaskLaneKey, TaskLaneSpec } from '@/features/projects/model/task-lanes';

export const TASK_LANES: readonly TaskLaneSpec[] = [
  { key: 'todo', statuses: ['todo', 'backlog'], status: 'todo' },
  { key: 'doing', statuses: ['doing'], status: 'doing' },
  { key: 'done', statuses: ['done', 'canceled'], status: 'done' },
];

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'planned',
  'active',
  'paused',
  'done',
  'canceled',
];

export const TASK_PRIORITIES: readonly ProjectTaskPriority[] = [
  'none',
  'low',
  'medium',
  'high',
  'urgent',
];

export const PROJECT_NAME_MAX = 120;

export const PROJECT_DESCRIPTION_MAX = 500;

export const TASK_TITLE_MAX = 160;

export const NAMES_SHOWN = 2;

export const PROJECT_IDEAS: readonly TranslationKey[] = [
  'screens.projects.empty.idea-move',
  'screens.projects.empty.idea-party',
];

export const LANE_LABEL: Record<TaskLaneKey, TranslationKey> = {
  todo: 'screens.projects.lane.todo',
  doing: 'screens.projects.lane.doing',
  done: 'screens.projects.lane.done',
};

export const TASK_STATUS_LABEL: Record<ProjectTaskStatus, TranslationKey> = {
  backlog: 'screens.projects.status.backlog',
  todo: 'screens.projects.status.todo',
  doing: 'screens.projects.status.doing',
  done: 'screens.projects.status.done',
  canceled: 'screens.projects.status.canceled',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, TranslationKey> = {
  planned: 'screens.projects.project-status.planned',
  active: 'screens.projects.project-status.active',
  paused: 'screens.projects.project-status.paused',
  done: 'screens.projects.project-status.done',
  canceled: 'screens.projects.project-status.canceled',
};

export const PRIORITY_LABEL: Record<ProjectTaskPriority, TranslationKey> = {
  none: 'screens.projects.priority.none',
  low: 'screens.projects.priority.low',
  medium: 'screens.projects.priority.medium',
  high: 'screens.projects.priority.high',
  urgent: 'screens.projects.priority.urgent',
};

export const BOARD_MIN_WIDTH = 1280;
