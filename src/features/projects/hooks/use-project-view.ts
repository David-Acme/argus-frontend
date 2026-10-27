import type { IProjectCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { DashboardProjectCard } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { peopleAccessOf } from '@/shared/libs/capabilities';
import type { TaskProgress } from '@/shared/libs/task-progress';
import { useProjectMembers, useProjectTasks } from '@/features/projects/hooks/use-project-data';
import type { ProjectMembers, ProjectTasks } from '@/features/projects/hooks/use-project-data';
import { projectAccessOf } from '@/features/projects/model/project-access';
import { projectRights } from '@/features/projects/model/project-rights';
import type { ProjectRights } from '@/features/projects/model/project-rights';
import { projectLine } from '@/features/projects/model/project-words';
import { groupTasksByLane } from '@/features/projects/model/task-lanes';
import type { TaskLanes } from '@/features/projects/model/task-lanes';

export type ProjectViewInput = { project: IProjectCacheRow | null; pending: boolean };

export type ProjectView = {
  project: IProjectCacheRow;
  tasks: ProjectTasks;
  members: ProjectMembers;
  lanes: TaskLanes;
  rights: ProjectRights;
  line: string;
};

export type ProjectSummary = { line: string; progress: TaskProgress };

const NO_PROGRESS: TaskProgress = { done: 0, total: 0 };

export function useProjectSummary(project: IProjectCacheRow): ProjectSummary {
  const { t } = useTranslation();
  const card = useViewCacheRows<DashboardProjectCard>(VIEW_CACHE_KEYS.dashboardProjects).find(
    (candidate) => candidate.id === project.id
  );
  const progress = card ? { done: card.done, total: card.total } : NO_PROGRESS;
  const { rows } = useProjectMembers(project.id);
  return {
    line: projectLine(
      { names: rows.map((member) => member.name), progress, status: project.status },
      t
    ),
    progress,
  };
}

export function useProjectView({ project, pending }: ProjectViewInput): ProjectView | null {
  const { t } = useTranslation();
  const capabilities = useCapabilities();
  const userId = String(useAuthStore((state) => state.user?.id ?? ''));
  const id = project?.id ?? '';
  const tasks = useProjectTasks(id);
  const members = useProjectMembers(id);
  if (!project) return null;
  const access = projectAccessOf({ ownerId: project.ownerId, userId, members: members.rows });
  return {
    project,
    tasks,
    members,
    lanes: groupTasksByLane(tasks.rows),
    rights: projectRights({
      access,
      can: capabilities.can,
      pending,
      directory: peopleAccessOf(capabilities).receivesDirectory,
    }),
    line: projectLine(
      {
        names: members.rows.map((member) => member.name),
        progress: tasks.progress,
        status: project.status,
      },
      t
    ),
  };
}
