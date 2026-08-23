import { useMemo } from 'react';
import { projectService } from '@/core/services/project.service';
import { projectTaskService } from '@/core/services/project-task.service';
import type { ModelOf } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useCachedRows } from './use-cached-rows';
import { useObservableReady } from './use-observable';

type ProjectListItem = {
  id: string;
  name: string;
  description: string;
  status: string;
};

export type ProjectTaskListItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: number | null;
};

type ProjectsData = {
  projects: ModelOf<'project'>[];
  tasks: ModelOf<'project_task'>[];
  displayProjects: readonly ProjectListItem[];
  displayTasks: readonly ProjectTaskListItem[];
  /**
   * The selection actually in effect: the caller's choice, or the first project
   * while nothing is chosen. Derived rather than stored, so the screen never
   * writes state from an effect just to pick a default.
   */
  activeId: string;
  progress: { done: number; total: number };
};

export function useProjectsData(selectedId: string): ProjectsData {
  const [projects, projectsReady] = useObservableReady(() => projectService.observeList(), [], []);
  const liveProjects = useMemo<ProjectListItem[]>(
    () => projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
    })),
    [projects],
  );
  const displayProjects = useCachedRows(VIEW_CACHE_KEYS.projectList, liveProjects, projectsReady);
  const activeId = selectedId.length > 0 ? selectedId : (displayProjects[0]?.id ?? '');
  const [tasks, tasksReady] = useObservableReady(
    () => projectTaskService.observeByProject(activeId),
    [],
    [activeId],
  );
  const liveTasks = useMemo<ProjectTaskListItem[]>(
    () => tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt?.getTime() ?? null,
    })),
    [tasks],
  );
  const displayTasks = useCachedRows(
    VIEW_CACHE_KEYS.projectTasks,
    liveTasks,
    projectsReady && tasksReady,
    activeId,
  );

  const progress = useMemo(
    () => ({
      done: displayTasks.filter((task) => task.status === 'done').length,
      total: displayTasks.length,
    }),
    [displayTasks],
  );

  return { projects, tasks, displayProjects, displayTasks, activeId, progress };
}
