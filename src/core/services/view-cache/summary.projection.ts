import type { DashboardSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import { ACTIVITY_WINDOW_DAYS } from '@/shared/constants/dashboard.constant';
import { isOpenTask } from '@/shared/libs/task-progress';
import type { CameraSource } from './camera.projection';
import { addDays, startOfDay, startOfNextDay } from './dates';
import type { ProjectSource, ProjectTaskSource } from './project.projection';
import type { ViewWrite } from './projection';

export type SummaryProjectionInput = {
  cameras: readonly Pick<CameraSource, 'isOnline' | 'isEnabled'>[];
  reminders: readonly { isCompleted: boolean }[];
  projects: readonly Pick<ProjectSource, 'status'>[];
  tasks: readonly Pick<ProjectTaskSource, 'status'>[];
  eventsCurrent: number;
  eventsPrevious: number;
};

export type ActivityWindow = { from: number; to: number };

export const activityWindows = (now: Date): { current: ActivityWindow; previous: ActivityWindow } => {
  const since = startOfDay(addDays(now, -(ACTIVITY_WINDOW_DAYS - 1)));
  return {
    current: { from: since, to: startOfNextDay(now) },
    previous: { from: startOfDay(addDays(now, -(2 * ACTIVITY_WINDOW_DAYS - 1))), to: since },
  };
};

export function projectSummary(input: SummaryProjectionInput): ViewWrite[] {
  const { eventsCurrent, eventsPrevious } = input;
  const summary: DashboardSummary = {
    camerasTotal: input.cameras.length,
    camerasOnline: input.cameras.filter((camera) => camera.isEnabled && camera.isOnline).length,
    remindersPending: input.reminders.filter((reminder) => !reminder.isCompleted).length,
    projectsActive: input.projects.filter((project) => project.status !== 'archived').length,
    tasksOpen: input.tasks.filter(isOpenTask).length,
    eventsCurrent,
    eventsPrevious,
  };
  return [{ key: VIEW_CACHE_KEYS.dashboardSummary, value: summary }];
}
