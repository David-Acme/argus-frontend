import type { ProjectModel, ProjectTaskModel } from '@/core/database';
import type { IProjectCacheRow, IProjectTaskCacheRow } from '@/core/interfaces';
import type { DashboardProjectCard } from '@/core/types';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';
import { taskProgress } from '@/shared/libs/task-progress';
import type { ViewWrite } from './projection';

export type ProjectSource = Pick<ProjectModel, 'id' | 'name' | 'description' | 'status'>;

export type ProjectTaskSource = Pick<
  ProjectTaskModel,
  'id' | 'projectId' | 'title' | 'status' | 'priority' | 'dueAt'
>;

export type ProjectProjectionInput = {
  projects: readonly ProjectSource[];
  tasks: readonly ProjectTaskSource[];
};

export function projectProjects({ projects, tasks }: ProjectProjectionInput): ViewWrite[] {
  const projectRows: IProjectCacheRow[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
  }));
  const tasksByProject = new Map<string, IProjectTaskCacheRow[]>();
  for (const task of tasks) {
    const bucket = tasksByProject.get(task.projectId) ?? [];
    bucket.push({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt?.getTime() ?? null,
    });
    tasksByProject.set(task.projectId, bucket);
  }
  const cards: DashboardProjectCard[] = projectRows.map((project) => {
    const progress = taskProgress(tasksByProject.get(project.id) ?? []);
    return {
      ...project,
      done: progress.done,
      total: progress.total,
      progress: progress.total > 0 ? progress.done / progress.total : 0,
    };
  });
  return [
    { key: VIEW_CACHE_KEYS.projectList, rows: projectRows, limit: VIEW_CACHE_LIST_LIMIT },
    ...projectRows.map(
      (project): ViewWrite => ({
        key: VIEW_CACHE_KEYS.projectTasks,
        scope: project.id,
        rows: tasksByProject.get(project.id) ?? [],
        limit: VIEW_CACHE_LIST_LIMIT,
      }),
    ),
    { key: VIEW_CACHE_KEYS.dashboardProjects, rows: cards },
  ];
}
