import type { ProjectStatus, ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';

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

export type IProjectTaskUpdate = Partial<Omit<IProjectTaskCreate, 'projectId' | 'dueAt'>> & {
  dueAt?: number | null;
};

