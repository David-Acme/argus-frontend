import type { IProjectCacheRow, IProjectTaskCacheRow } from '@/core/interfaces';
import type {
  ProjectStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
  TranslateFn,
} from '@/core/types';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import type { TaskProgress } from '@/shared/libs/task-progress';
import type { CheckState } from '@/shared/ui/check';
import {
  NAMES_SHOWN,
  PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  TASK_STATUS_LABEL,
} from '@/features/projects/constants/projects.constant';

export type ProjectLineInput = {
  names: readonly string[];
  progress: TaskProgress;
  status: string;
};

export type TaskWordsContext = { now: number; date: DateFormatter; t: TranslateFn };

export type TaskWords = { meta: string; alert: boolean };

const STATUS_SHOWN: ReadonlySet<string> = new Set(['planned', 'paused', 'done', 'canceled']);

const STATUS_NOTED: ReadonlySet<string> = new Set(['backlog', 'canceled']);

const PRIORITY_SHOWN: ReadonlySet<string> = new Set(['high', 'urgent']);

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

export function peopleWords(names: readonly string[], t: TranslateFn): string {
  const people = names.map(firstName).filter((name) => name.length > 0);
  const shown = people.slice(0, NAMES_SHOWN).join(', ');
  const rest = people.length - NAMES_SHOWN;
  return rest > 0 ? t('screens.projects.line.people-more', { names: shown, count: rest }) : shown;
}

export function progressWords({ done, total }: TaskProgress, t: TranslateFn): string {
  if (total === 0) return t('screens.projects.line.no-tasks');
  return t('screens.projects.line.progress', { done, total });
}

export const progressFraction = ({ done, total }: TaskProgress): number =>
  total > 0 ? done / total : 0;

export function projectLine({ names, progress, status }: ProjectLineInput, t: TranslateFn): string {
  return [
    peopleWords(names, t),
    STATUS_SHOWN.has(status) ? t(PROJECT_STATUS_LABEL[status as ProjectStatus]) : '',
    progressWords(progress, t),
  ]
    .filter((part) => part.length > 0)
    .join(' · ');
}

const finished = (status: string): boolean => status === 'done' || status === 'canceled';

export function isOverdue(task: IProjectTaskCacheRow, startOfToday: number): boolean {
  return task.dueAt !== null && task.dueAt < startOfToday && !finished(task.status);
}

export function taskCheck(task: IProjectTaskCacheRow, startOfToday: number): CheckState {
  if (task.status === 'done') return 'done';
  if (task.status === 'doing') return 'progress';
  return isOverdue(task, startOfToday) ? 'overdue' : 'open';
}

function dueWords(task: IProjectTaskCacheRow, { now, date, t }: TaskWordsContext): string {
  if (task.dueAt === null) return '';
  const due = new Date(task.dueAt);
  const day = date.formatDayMonth(due);
  if (isOverdue(task, date.startOfDay(new Date(now)).getTime()))
    return t('screens.projects.line.late', { day });
  if (date.sameDay(due, new Date(now))) return t('screens.projects.line.due-today');
  return t('screens.projects.line.due', { day });
}

export function taskWords(task: IProjectTaskCacheRow, context: TaskWordsContext): TaskWords {
  const { t, date, now } = context;
  const parts = [
    STATUS_NOTED.has(task.status) ? t(TASK_STATUS_LABEL[task.status as ProjectTaskStatus]) : '',
    dueWords(task, context),
    PRIORITY_SHOWN.has(task.priority)
      ? t(PRIORITY_LABEL[task.priority as ProjectTaskPriority])
      : '',
  ].filter((part) => part.length > 0);
  return {
    meta: parts.length > 0 ? parts.join(' · ') : t('screens.projects.line.no-date'),
    alert: isOverdue(task, date.startOfDay(new Date(now)).getTime()),
  };
}

export type ProjectGroups = { open: IProjectCacheRow[]; closed: IProjectCacheRow[] };

export function projectGroups(projects: readonly IProjectCacheRow[]): ProjectGroups {
  return {
    open: projects.filter((project) => !finished(project.status)),
    closed: projects.filter((project) => finished(project.status)),
  };
}
