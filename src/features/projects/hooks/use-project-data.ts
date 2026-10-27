import type {
  IPeopleDirectoryCacheRow,
  IProjectCacheRow,
  IProjectMemberCacheRow,
  IProjectTaskCacheRow,
  IProjectTasksPage,
} from '@/core/interfaces';
import { PROJECT_DONE_PAGE_SIZE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import {
  useInfiniteList,
  usePagedView,
  type InfiniteListState,
} from '@/shared/hooks/use-infinite-list';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import type { OptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import type { TaskProgress } from '@/shared/libs/task-progress';
import { projectMemberLens } from '@/features/projects/model/project-member-optimistic';
import { projectLens, projectTaskLens } from '@/features/projects/model/project-optimistic';
import { projectTaskRows } from '@/features/projects/model/task-lanes';

export type ProjectTasks = OptimisticRows<IProjectTaskCacheRow> & {
  progress: TaskProgress;
  doneTotal: number;
  donePaging: InfiniteListState;
};

export type ProjectMembers = OptimisticRows<IProjectMemberCacheRow> & {
  people: readonly IPeopleDirectoryCacheRow[];
};

const PROJECT_LENSES = [projectLens];

const NO_TASKS: readonly IProjectTaskCacheRow[] = [];

const NO_PROGRESS: TaskProgress = { done: 0, total: 0 };

export function useProjectTaskPage(projectId: string) {
  return usePagedView<IProjectTaskCacheRow, IProjectTasksPage>(
    VIEW_CACHE_KEYS.projectTasks,
    projectId,
    projectId !== ''
  );
}

export function useProjects(): OptimisticRows<IProjectCacheRow> {
  const cached = useViewCacheRows<IProjectCacheRow>(VIEW_CACHE_KEYS.projectList);
  return useOptimisticRows(cached, PROJECT_LENSES);
}

export function useProjectTasks(projectId: string): ProjectTasks {
  const page = useProjectTaskPage(projectId);
  const lenses = [projectTaskLens(projectId)];
  const tasks = useOptimisticRows(
    projectTaskRows(page.snapshot?.open ?? NO_TASKS, page.rows),
    lenses
  );
  const donePaging = useInfiniteList({
    count: page.rows.length,
    hasMore: page.hasMore,
    loadMore: page.loadMore,
    endAfter: PROJECT_DONE_PAGE_SIZE,
  });
  return {
    ...tasks,
    progress: page.snapshot?.progress ?? NO_PROGRESS,
    doneTotal: page.snapshot?.doneTotal ?? 0,
    donePaging,
  };
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
