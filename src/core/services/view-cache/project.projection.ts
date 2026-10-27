import type {
  ProjectMemberModel,
  ProjectModel,
  ProjectTaskModel,
  UserModel,
} from '@/core/database';
import type {
  IProjectCacheRow,
  IProjectMemberCacheRow,
  IProjectTaskCacheRow,
  IProjectTasksPage,
  IWeekTaskCounts,
} from '@/core/interfaces';
import type { DashboardProjectCard, KeysetPage } from '@/core/types';
import { sanitizeCreatedVia } from '@/core/database/tables/sanitizers';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';
import type { TaskProgress } from '@/shared/libs/task-progress';
import type { ViewWrite } from './projection';

export type ProjectSource = Pick<
  ProjectModel,
  'id' | 'ownerId' | 'name' | 'description' | 'status'
>;

export type ProjectMemberSource = Pick<
  ProjectMemberModel,
  'id' | 'projectId' | 'userId' | 'access'
>;

export type ProjectUserSource = Pick<UserModel, 'id' | 'name' | 'lastName'>;

export type ProjectTaskSource = Pick<
  ProjectTaskModel,
  'id' | 'projectId' | 'title' | 'status' | 'priority' | 'dueAt' | 'createdVia'
>;

export type ProjectProgressMap = ReadonlyMap<string, TaskProgress>;

export type ProjectProjectionInput = {
  projects: readonly ProjectSource[];
  progress: ProjectProgressMap;
  members: readonly ProjectMemberSource[];
  users: readonly ProjectUserSource[];
};

export type ProjectTasksInput = {
  open: readonly ProjectTaskSource[];
  done: KeysetPage<ProjectTaskSource>;
  counts: TaskProgress & { closed: number };
};

export type WeekCountsInput = { counts: { open: number; done: number } };

const NO_PROGRESS: TaskProgress = { done: 0, total: 0 };

const fullName = (user: ProjectUserSource | undefined): string =>
  user ? [user.name, user.lastName].filter((part) => part.length > 0).join(' ') : '';

export const toTaskRow = (task: ProjectTaskSource): IProjectTaskCacheRow => ({
  id: task.id,
  projectId: task.projectId,
  title: task.title,
  status: task.status,
  priority: task.priority,
  dueAt: task.dueAt?.getTime() ?? null,
  createdVia: sanitizeCreatedVia(task.createdVia),
});

function membersByProject(
  members: readonly ProjectMemberSource[],
  users: readonly ProjectUserSource[]
): Map<string, IProjectMemberCacheRow[]> {
  const people = new Map(users.map((user) => [user.id, user]));
  const byProject = new Map<string, IProjectMemberCacheRow[]>();
  for (const member of members) {
    const bucket = byProject.get(member.projectId) ?? [];
    bucket.push({
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      name: fullName(people.get(member.userId)),
      access: member.access,
    });
    byProject.set(member.projectId, bucket);
  }
  return byProject;
}

export function projectProjects({
  projects,
  progress,
  members,
  users,
}: ProjectProjectionInput): ViewWrite[] {
  const projectRows: IProjectCacheRow[] = projects.map((project) => ({
    id: project.id,
    ownerId: project.ownerId,
    name: project.name,
    description: project.description,
    status: project.status,
  }));
  const byProject = membersByProject(members, users);
  const cards: DashboardProjectCard[] = projectRows.map((project) => {
    const { done, total } = progress.get(project.id) ?? NO_PROGRESS;
    return { ...project, done, total, progress: total > 0 ? done / total : 0 };
  });
  return [
    { key: VIEW_CACHE_KEYS.projectList, rows: projectRows, limit: VIEW_CACHE_LIST_LIMIT },
    ...projectRows.map((project): ViewWrite => ({
      key: VIEW_CACHE_KEYS.projectMembers,
      scope: project.id,
      rows: byProject.get(project.id) ?? [],
      limit: VIEW_CACHE_LIST_LIMIT,
    })),
    { key: VIEW_CACHE_KEYS.dashboardProjects, rows: cards },
  ];
}

export function projectTasksPage(
  { open, done, counts }: ProjectTasksInput,
  scope: string
): ViewWrite[] {
  const value: IProjectTasksPage = {
    rows: done.rows.map(toTaskRow),
    hasMore: done.hasMore,
    open: open.map(toTaskRow),
    doneTotal: counts.closed,
    progress: { done: counts.done, total: counts.total },
  };
  return [{ key: VIEW_CACHE_KEYS.projectTasks, scope, value }];
}

export function projectWeekTasks({ counts }: WeekCountsInput): ViewWrite[] {
  const value: IWeekTaskCounts = { done: counts.done, pending: counts.open };
  return [{ key: VIEW_CACHE_KEYS.weekTasks, value }];
}
