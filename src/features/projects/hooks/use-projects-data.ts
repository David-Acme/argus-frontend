import { useMemo } from 'react';
import type {
  IProjectCacheRow,
  IProjectsCacheData,
  IProjectTaskCacheRow,
} from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { taskProgress } from '@/shared/libs/task-progress';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';

export function useProjectsData(selectedId: string): IProjectsCacheData {
  const projects = useViewCacheRows<IProjectCacheRow>(VIEW_CACHE_KEYS.projectList);
  const displayProjects = projects;
  const activeId = selectedId.length > 0 ? selectedId : (displayProjects[0]?.id ?? '');
  const tasks = useViewCacheRows<IProjectTaskCacheRow>(VIEW_CACHE_KEYS.projectTasks, activeId);
  const displayTasks = tasks;

  const progress = useMemo(() => taskProgress(displayTasks), [displayTasks]);

  return { projects, tasks, displayProjects, displayTasks, activeId, progress };
}
