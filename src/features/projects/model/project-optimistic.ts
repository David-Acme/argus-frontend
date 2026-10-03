import type {
  IProjectCacheRow,
  IProjectCreate,
  IProjectTaskCacheRow,
  IProjectTaskCreate,
} from '@/core/interfaces';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';

const secondsToMs = (value: number | undefined, fallback: number | null): number | null =>
  value === undefined ? fallback : value * 1000;

export const projectLens: OptimisticLens<IProjectCacheRow> = defineLens<IProjectCacheRow, IProjectCreate>({
  table: 'project',
  prepend: true,
  recordIdOf: (row) => row.id,
  patch: (row, values) => ({
    ...row,
    name: values.name ?? row.name,
    description: values.description ?? row.description,
    status: values.status ?? row.status,
  }),
  create: (recordId, values) => ({
    id: recordId,
    name: values.name ?? '',
    description: values.description ?? '',
    status: values.status ?? 'active',
  }),
});

export function projectTaskLens(projectId: string): OptimisticLens<IProjectTaskCacheRow> {
  return defineLens<IProjectTaskCacheRow, IProjectTaskCreate>({
    table: 'project_task',
    recordIdOf: (row) => row.id,
    patch: (row, values) => ({
      ...row,
      title: values.title ?? row.title,
      status: values.status ?? row.status,
      priority: values.priority ?? row.priority,
      dueAt: secondsToMs(values.dueAt, row.dueAt),
    }),
    create: (recordId, values) =>
      String(values.projectId) === projectId
        ? {
            id: recordId,
            projectId,
            title: values.title ?? '',
            status: values.status ?? 'todo',
            priority: values.priority ?? 'none',
            dueAt: secondsToMs(values.dueAt, null),
          }
        : null,
  });
}
