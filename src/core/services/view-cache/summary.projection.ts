import type { DashboardSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import { ACTIVITY_WINDOW_DAYS } from '@/shared/constants/dashboard.constant';
import { isOpenTask } from '@/shared/libs/task-progress';
import type { CameraSource } from './camera.projection';
import type { EventSource } from './activity.projection';
import { DAY_MS, startOfDay } from './dates';
import type { ProjectSource, ProjectTaskSource } from './project.projection';
import type { ProjectionContext, ViewWrite } from './projection';

export type SummaryProjectionInput = {
  cameras: readonly Pick<CameraSource, 'isOnline' | 'isEnabled'>[];
  reminders: readonly { isCompleted: boolean }[];
  projects: readonly Pick<ProjectSource, 'status'>[];
  tasks: readonly Pick<ProjectTaskSource, 'status'>[];
  events: readonly Pick<EventSource, 'occurredAt'>[];
};

export function projectSummary(input: SummaryProjectionInput, { now }: ProjectionContext): ViewWrite[] {
  const since = startOfDay(now) - (ACTIVITY_WINDOW_DAYS - 1) * DAY_MS;
  const previousSince = since - ACTIVITY_WINDOW_DAYS * DAY_MS;
  let eventsCurrent = 0;
  let eventsPrevious = 0;
  for (const event of input.events) {
    const occurredAt = event.occurredAt.getTime();
    if (occurredAt >= since) eventsCurrent += 1;
    else if (occurredAt >= previousSince) eventsPrevious += 1;
  }
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
