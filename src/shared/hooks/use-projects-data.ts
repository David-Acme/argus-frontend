import { useMemo } from 'react';
import type {
  IProjectCacheRow,
  IProjectsCacheData,
  IProjectTaskCacheRow,
} from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from './use-cached-rows';

export function useProjectsData(selectedId: string): IProjectsCacheData {
  const projects = useViewCacheRows<IProjectCacheRow>(VIEW_CACHE_KEYS.projectList);
  const displayProjects = projects;
  const activeId = selectedId.length > 0 ? selectedId : (displayProjects[0]?.id ?? '');
  const tasks = useViewCacheRows<IProjectTaskCacheRow>(VIEW_CACHE_KEYS.projectTasks, activeId);
  const displayTasks = tasks;

  const progress = useMemo(
    () => ({
      done: displayTasks.filter((task) => task.status === 'done').length,
      total: displayTasks.length,
    }),
    [displayTasks],
  );

  return { projects, tasks, displayProjects, displayTasks, activeId, progress };
}
