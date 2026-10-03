import { useMemo } from 'react';
import type { IProjectCacheRow, IProjectTaskCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { taskProgress, type TaskProgress } from '@/shared/libs/task-progress';
import { projectLens, projectTaskLens } from '@/features/projects/model/project-optimistic';

type ProjectsData = {
  projects: readonly IProjectCacheRow[];
  tasks: readonly IProjectTaskCacheRow[];
  activeId: string;
  activePending: boolean;
  progress: TaskProgress;
  isPendingTask: (task: IProjectTaskCacheRow) => boolean;
};

const PROJECT_LENSES = [projectLens];

export function useProjectsData(selectedId: string): ProjectsData {
  const cachedProjects = useViewCacheRows<IProjectCacheRow>(VIEW_CACHE_KEYS.projectList);
  const { rows: projects, isPending: isPendingProject } = useOptimisticRows(
    cachedProjects,
    PROJECT_LENSES
  );
  const selected = projects.find((project) => project.id === selectedId);
  const active = selected ?? projects[0];
  const activeId = active?.id ?? '';
  const cachedTasks = useViewCacheRows<IProjectTaskCacheRow>(
    VIEW_CACHE_KEYS.projectTasks,
    activeId
  );
  const taskLenses = useMemo(() => [projectTaskLens(activeId)], [activeId]);
  const { rows: tasks, isPending: isPendingTask } = useOptimisticRows(cachedTasks, taskLenses);
  const progress = useMemo(() => taskProgress(tasks), [tasks]);

  return {
    projects,
    tasks,
    activeId,
    activePending: active ? isPendingProject(active) : false,
    progress,
    isPendingTask,
  };
}
