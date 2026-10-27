import type { DashboardSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import type { CameraSource } from './camera.projection';
import type { ProjectSource } from './project.projection';
import type { ViewWrite } from './projection';

export type SummaryProjectionInput = {
  cameras: readonly Pick<CameraSource, 'isOnline' | 'isEnabled'>[];
  projects: readonly Pick<ProjectSource, 'status'>[];
  openTasks: number;
};


export function projectSummary(input: SummaryProjectionInput): ViewWrite[] {
  const summary: DashboardSummary = {
    camerasTotal: input.cameras.length,
    camerasOnline: input.cameras.filter((camera) => camera.isEnabled && camera.isOnline).length,
    projectsActive: input.projects.filter((project) => project.status === 'active').length,
    projectsTotal: input.projects.length,
    tasksOpen: input.openTasks,
  };
  return [{ key: VIEW_CACHE_KEYS.dashboardSummary, value: summary }];
}
