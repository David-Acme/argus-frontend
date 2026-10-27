import type { DashboardSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import { isOpenTask } from '@/shared/libs/task-progress';
import type { CameraSource } from './camera.projection';
import type { ProjectSource, ProjectTaskSource } from './project.projection';
import type { ViewWrite } from './projection';

export type SummaryProjectionInput = {
  cameras: readonly Pick<CameraSource, 'isOnline' | 'isEnabled'>[];
  projects: readonly Pick<ProjectSource, 'status'>[];
  tasks: readonly Pick<ProjectTaskSource, 'status'>[];
};


export function projectSummary(input: SummaryProjectionInput): ViewWrite[] {
  const summary: DashboardSummary = {
    camerasTotal: input.cameras.length,
    camerasOnline: input.cameras.filter((camera) => camera.isEnabled && camera.isOnline).length,
    projectsActive: input.projects.filter((project) => project.status === 'active').length,
    tasksOpen: input.tasks.filter(isOpenTask).length,
  };
  return [{ key: VIEW_CACHE_KEYS.dashboardSummary, value: summary }];
}
