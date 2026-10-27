import type {
  IPeopleDirectoryCacheRow,
  IProjectCacheRow,
  IProjectMemberCacheRow,
  IProjectTaskCacheRow,
} from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import type { OptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { taskProgress } from '@/shared/libs/task-progress';
import type { TaskProgress } from '@/shared/libs/task-progress';
import { projectMemberLens } from '@/features/projects/model/project-member-optimistic';
import { projectLens, projectTaskLens } from '@/features/projects/model/project-optimistic';

export type ProjectTasks = OptimisticRows<IProjectTaskCacheRow> & { progress: TaskProgress };

export type ProjectMembers = OptimisticRows<IProjectMemberCacheRow> & {
  people: readonly IPeopleDirectoryCacheRow[];
};

const PROJECT_LENSES = [projectLens];

export function useProjects(): OptimisticRows<IProjectCacheRow> {
  const cached = useViewCacheRows<IProjectCacheRow>(VIEW_CACHE_KEYS.projectList);
  return useOptimisticRows(cached, PROJECT_LENSES);
}

export function useProjectTasks(projectId: string): ProjectTasks {
  const cached = useViewCacheRows<IProjectTaskCacheRow>(VIEW_CACHE_KEYS.projectTasks, projectId);
  const lenses = [projectTaskLens(projectId)];
  const tasks = useOptimisticRows(cached, lenses);
  return { ...tasks, progress: taskProgress(tasks.rows) };
}

export function useProjectMembers(projectId: string): ProjectMembers {
  const cached = useViewCacheRows<IProjectMemberCacheRow>(
    VIEW_CACHE_KEYS.projectMembers,
    projectId
  );
  const people = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const lenses = [projectMemberLens(projectId, people)];
  return { ...useOptimisticRows(cached, lenses), people };
}
