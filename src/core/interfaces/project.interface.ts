import type { ProjectStatus, ProjectTaskPriority, ProjectTaskStatus, ShareAccess } from '@/core/types';

/** Wire payloads of the project REST endpoints. Timestamps are epoch SECONDS. */
export interface IProjectCreate {
  name: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  startsAt?: number;
  targetAt?: number;
}

export type IProjectUpdate = Partial<IProjectCreate>;

export interface IProjectTaskCreate {
  projectId: number;
  title: string;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority;
  assigneeId?: number;
  dueAt?: number;
  sortOrder?: number;
}

export type IProjectTaskUpdate = Partial<Omit<IProjectTaskCreate, 'projectId'>>;

/** Sharing a project with one person, at one access level. */
export interface IProjectMemberCreate {
  projectId: number;
  userId: number;
  access?: ShareAccess;
}

export interface IShareAccessUpdate {
  access: ShareAccess;
}
