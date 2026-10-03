import { shareReplay, type Observable, type Subscription } from 'rxjs';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { cameraService } from '@/core/services/camera.service';
import { cameraStreamService } from '@/core/services/camera-stream.service';
import { eventService } from '@/core/services/event.service';
import { notificationService } from '@/core/services/notification.service';
import { projectService } from '@/core/services/project.service';
import { projectTaskService } from '@/core/services/project-task.service';
import { reminderService } from '@/core/services/reminder.service';
import { userInvitationService } from '@/core/services/user-invitation.service';
import { userService } from '@/core/services/user.service';
import { zoneService } from '@/core/services/zone.service';
import { EVENT_SAMPLE_LIMIT } from '@/shared/constants';
import { projectActivity } from './view-cache/activity.projection';
import {
  calendarMonthScope,
  calendarWindow,
  projectAgenda,
  projectCalendar,
  todayRange,
} from './view-cache/calendar.projection';
import { projectCameras } from './view-cache/camera.projection';
import { projectNotifications } from './view-cache/notification.projection';
import { projectPeople } from './view-cache/people.projection';
import { projectProjects } from './view-cache/project.projection';
import { DAY_MS, startOfDay } from './view-cache/dates';
import { startProjection, type ProjectionContext } from './view-cache/projection';
import { projectSummary } from './view-cache/summary.projection';

const NOTIFICATION_PREVIEW_LIMIT = 8;

const shared = <T>(source: Observable<T>): Observable<T> =>
  source.pipe(shareReplay({ bufferSize: 1, refCount: true }));

function sessionSources(userId: string) {
  return {
    cameras: shared(cameraService.observeList()),
    zones: shared(zoneService.observeForCache()),
    streams: shared(cameraStreamService.observePrimaries()),
    projects: shared(projectService.observeList()),
    tasks: shared(projectTaskService.observeAll()),
    reminders: shared(reminderService.observeForUser(userId)),
    notifications: shared(notificationService.observeForUser(userId, NOTIFICATION_PREVIEW_LIMIT)),
    unread: shared(notificationService.observeUnreadCountForUser(userId)),
    events: shared(eventService.observeRecent(EVENT_SAMPLE_LIMIT)),
    users: shared(userService.observeDirectory()),
    invitations: shared(userInvitationService.observeList()),
  };
}

type SessionSources = ReturnType<typeof sessionSources>;

function startSessionProjections(sources: SessionSources, ctx: ProjectionContext): Subscription[] {
  const { from, to } = todayRange(ctx.now);
  return [
    startProjection(
      {
        sources: () => ({ cameras: sources.cameras, zones: sources.zones, streams: sources.streams }),
        project: projectCameras,
      },
      ctx,
    ),
    startProjection(
      {
        sources: () => ({ projects: sources.projects, tasks: sources.tasks }),
        project: projectProjects,
        tracked: ['project.tasks'],
      },
      ctx,
    ),
    startProjection({ sources: () => ({ users: sources.users, invitations: sources.invitations }), project: projectPeople }, ctx),
    startProjection(
      { sources: () => ({ notifications: sources.notifications, unread: sources.unread }), project: projectNotifications },
      ctx,
    ),
    startProjection({ sources: () => ({ events: sources.events }), project: projectActivity }, ctx),
    startProjection(
      {
        sources: () => ({
          cameras: sources.cameras,
          reminders: sources.reminders,
          projects: sources.projects,
          tasks: sources.tasks,
          events: sources.events,
        }),
        project: projectSummary,
      },
      ctx,
    ),
    startProjection(
      {
        sources: () => ({
          events: calendarEventService.observeRange(from, to),
          reminders: sources.reminders,
          tasks: projectTaskService.observeDueRange(from, to),
        }),
        project: projectAgenda,
      },
      ctx,
    ),
  ];
}

class ViewCacheCoordinatorService {
  private userId: string | null = null;
  private sources: SessionSources | null = null;
  private subscriptions: Subscription[] = [];
  private calendarSubscription: Subscription | null = null;
  private calendarScope: string | null = null;
  private nextDayTimer: ReturnType<typeof setTimeout> | null = null;

  start(userId: number | string): void {
    const nextUserId = String(userId);
    if (this.userId === nextUserId) return;
    this.stop();
    this.userId = nextUserId;
    this.sources = sessionSources(nextUserId);
    this.refresh();
  }

  stop(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];
    this.calendarSubscription?.unsubscribe();
    this.calendarSubscription = null;
    if (this.nextDayTimer) clearTimeout(this.nextDayTimer);
    this.nextDayTimer = null;
    this.calendarScope = null;
    this.sources = null;
    this.userId = null;
  }

  watchCalendarMonth(anchor: Date): void {
    const { sources, userId } = this;
    if (!sources || !userId) return;
    const scope = calendarMonthScope(anchor);
    if (scope === this.calendarScope) return;
    this.calendarSubscription?.unsubscribe();
    this.calendarScope = scope;
    const window = calendarWindow(anchor);
    this.calendarSubscription = startProjection(
      {
        sources: () => ({
          events: calendarEventService.observeRange(window.from, window.to),
          reminders: sources.reminders,
          tasks: projectTaskService.observeDueRange(window.from, window.to),
        }),
        project: (values) => projectCalendar(values, anchor),
        tracked: ['calendar.entries'],
      },
      { userId, now: new Date() },
    );
  }

  private refresh(): void {
    const userId = this.userId;
    const sources = this.sources;
    if (!userId || !sources) return;
    const now = new Date();
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = startSessionProjections(sources, { userId, now });
    this.calendarScope = null;
    this.watchCalendarMonth(now);
    const nextDay = startOfDay(now) + DAY_MS;
    this.nextDayTimer = setTimeout(() => this.refresh(), Math.max(1_000, nextDay - now.getTime() + 1_000));
  }
}

export const viewCacheCoordinatorService = new ViewCacheCoordinatorService();
