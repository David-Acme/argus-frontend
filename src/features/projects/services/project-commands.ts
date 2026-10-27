import type { IProjectCacheRow, IProjectTaskCacheRow } from '@/core/interfaces';
import { projectService } from '@/core/services/project.service';
import { projectTaskService } from '@/core/services/project-task.service';
import type { ProjectTaskStatus, TranslateFn } from '@/core/types';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { projectBody } from '@/features/projects/model/project-draft';
import type { ProjectDraft } from '@/features/projects/model/project-draft';
import { taskCreateBody, taskUpdateBody } from '@/features/projects/model/task-draft';
import type { TaskDraft } from '@/features/projects/model/task-draft';

export type StatusCommand = {
  task: IProjectTaskCacheRow;
  status: ProjectTaskStatus;
  t: TranslateFn;
};

export type TaskCommand = { task: IProjectTaskCacheRow; t: TranslateFn };

export type SaveTaskCommand = {
  draft: TaskDraft;
  task: IProjectTaskCacheRow | null;
  t: TranslateFn;
};

export type SaveProjectCommand = {
  draft: ProjectDraft;
  project: IProjectCacheRow | null;
  t: TranslateFn;
};

export type ProjectCommand = { project: IProjectCacheRow; t: TranslateFn };

export function setTaskStatus({ task, status, t }: StatusCommand) {
  return runOptimistic({
    intents: [{ table: 'project_task', kind: 'update', recordId: task.id, values: { status } }],
    call: () => projectTaskService.update(task.id, { status }),
    undo:
      status === 'done'
        ? { title: t('screens.projects.task-done'), description: task.title }
        : undefined,
  });
}

export function removeTask({ task, t }: TaskCommand) {
  return runOptimistic({
    intents: [{ table: 'project_task', kind: 'delete', recordId: task.id }],
    call: () => projectTaskService.remove(task.id),
    undo: { title: t('screens.projects.task-removed'), description: task.title },
  });
}

export function saveTask({ draft, task, t }: SaveTaskCommand) {
  if (task) {
    const body = taskUpdateBody(draft, task);
    return runOptimistic({
      intents: [{ table: 'project_task', kind: 'update', recordId: task.id, values: body }],
      call: () => projectTaskService.update(task.id, body),
      success: t('screens.projects.task-saved'),
    });
  }
  const body = taskCreateBody(draft);
  return runOptimistic({
    intents: [{ table: 'project_task', kind: 'create', values: body }],
    call: (key) => projectTaskService.create(body, key),
    success: t('screens.projects.task-saved'),
  });
}

export function saveProject({ draft, project, t }: SaveProjectCommand) {
  const body = projectBody(draft);
  if (project)
    return runOptimistic({
      intents: [{ table: 'project', kind: 'update', recordId: project.id, values: body }],
      call: () => projectService.update(project.id, body),
      success: t('screens.projects.project-saved'),
    });
  return runOptimistic({
    intents: [{ table: 'project', kind: 'create', values: body }],
    call: (key) => projectService.create(body, key),
    success: t('screens.projects.project-saved'),
  });
}

export function removeProject({ project, t }: ProjectCommand) {
  return runOptimistic({
    confirm: {
      title: t('screens.projects.delete-project-title', { name: project.name }),
      description: t('screens.projects.delete-project-body'),
      confirmLabel: t('screens.projects.delete-project'),
      intent: 'danger',
    },
    intents: [{ table: 'project', kind: 'delete', recordId: project.id }],
    call: () => projectService.remove(project.id),
    success: t('screens.projects.project-removed'),
  });
}
