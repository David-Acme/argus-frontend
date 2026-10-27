import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { ProjectTaskStatus, TranslateFn } from '@/core/types';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';

export type TaskHandlers = {
  setStatus: (task: IProjectTaskCacheRow, status: ProjectTaskStatus) => void;
  toggle: (task: IProjectTaskCacheRow) => void;
  remove: (task: IProjectTaskCacheRow) => void;
  edit: (task: IProjectTaskCacheRow) => void;
};

export type TaskContext = {
  now: number;
  date: DateFormatter;
  t: TranslateFn;
  editable: boolean;
  handlers: TaskHandlers;
};
