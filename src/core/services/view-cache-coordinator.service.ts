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
import type { AgendaWindow, KeysetWindow } from '@/core/types';
import {
  AGENDA_FEED_INITIAL_WEEKS,
  AGENDA_FEED_STEP_WEEKS,
  EVENT_MOSAIC_LIMIT,
  EVENT_SAMPLE_LIMIT,
  NOTIFICATION_FEED_SCOPE,
  MODULE_IDS,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { mosaicSince, projectActivity } from './view-cache/activity.projection';
import {
  agendaScope,
  agendaSpan,
  calendarMonthScope,
  calendarWindow,
  projectAgenda,
  projectAgendaFeed,
  projectCalendar,
  todayRange,
} from './view-cache/calendar.projection';
import { projectCameras } from './view-cache/camera.projection';
import { projectNotificationFeed } from './view-cache/notification.projection';
import { ModuleSourceGate } from './view-cache/module-source-gate';
import { PagedView, type IPagedView } from './view-cache/paged-view';
import { projectPeople } from './view-cache/people.projection';
import { projectProjects } from './view-cache/project.projection';
import { projectReminders } from './view-cache/reminder.projection';
import { startOfNextDay } from './view-cache/dates';
import { startProjection, type ProjectionContext } from './view-cache/projection';
import { activityWindows, projectSummary } from './view-cache/summary.projection';

const shared = <T>(source: Observable<T>): Observable<T> =>
  source.pipe(shareReplay({ bufferSize: 1, refCount: true }));

const moduleGate = new ModuleSourceGate();

const SURVEILLANCE = MODULE_IDS.surveillance;
const PRODUCTIVITY = MODULE_IDS.productivity;

function sessionSources(userId: string) {
  return {
    cameras: shared(moduleGate.of(SURVEILLANCE, cameraService.observeList(), [])),
    zones: shared(moduleGate.of(SURVEILLANCE, zoneService.observeForCache(), [])),
    streams: shared(moduleGate.of(SURVEILLANCE, cameraStreamService.observePrimaries(), [])),
    projects: shared(moduleGate.of(PRODUCTIVITY, projectService.observeList(), [])),
    tasks: shared(moduleGate.of(PRODUCTIVITY, projectTaskService.observeAll(), [])),
    reminders: shared(reminderService.observeForUser(userId)),
    unread: shared(notificationService.observeUnreadCountForUser(userId)),
    events: shared(moduleGate.of(SURVEILLANCE, eventService.observeRecent(EVENT_SAMPLE_LIMIT), [])),
    users: shared(userService.observeDirectory()),
    invitations: shared(userInvitationService.observeList()),
  };
}

type SessionSources = ReturnType<typeof sessionSources>;

function startSessionProjections(sources: SessionSources, ctx: ProjectionContext): Subscription[] {
  const { from, to } = todayRange(ctx.now);
  const windows = activityWindows(ctx.now);
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
    startProjection({ sources: () => ({ reminders: sources.reminders }), project: projectReminders }, ctx),
    startProjection(
      {
        sources: () => ({
          events: sources.events,
          mosaic: moduleGate.of(SURVEILLANCE, eventService.observeOccurredSince(mosaicSince(ctx.now), EVENT_MOSAIC_LIMIT), []),
        }),
        project: projectActivity,
      },
      ctx,
    ),
    startProjection(
      {
        sources: () => ({
          cameras: sources.cameras,
          reminders: sources.reminders,
          projects: sources.projects,
          tasks: sources.tasks,
          eventsCurrent: moduleGate.of(SURVEILLANCE, eventService.observeCountBetween(windows.current.from, windows.current.to), 0),
          eventsPrevious: moduleGate.of(SURVEILLANCE, eventService.observeCountBetween(windows.previous.from, windows.previous.to), 0),
        }),
        project: projectSummary,
      },
      ctx,
    ),
    startProjection(
      {
        sources: () => ({
          events: moduleGate.of(PRODUCTIVITY, calendarEventService.observeRange(from, to), []),
          reminders: sources.reminders,
          tasks: moduleGate.of(PRODUCTIVITY, projectTaskService.observeDueRange(from, to), []),
        }),
        project: projectAgenda,
      },
      ctx,
    ),
  ];
}

export type PagedViewKey =
  typeof VIEW_CACHE_KEYS.notificationFeed | typeof VIEW_CACHE_KEYS.calendarAgenda;

const sameKeyset = (left: KeysetWindow, right: KeysetWindow): boolean =>
  left.through?.id === right.through?.id && left.through?.value === right.through?.value;

function startPagedViews(
  sources: SessionSources,
  ctx: ProjectionContext,
): Record<PagedViewKey, IPagedView> {
  return {
    [VIEW_CACHE_KEYS.notificationFeed]: new PagedView<KeysetWindow>(
      {
        key: VIEW_CACHE_KEYS.notificationFeed,
        warm: [NOTIFICATION_FEED_SCOPE],
        initial: () => ({ through: null }),
        open: (scope, window, context) =>
          startProjection(
            {
              sources: () => ({
                page: notificationService.observeFeedPage(context.userId, window),
                unread: sources.unread,
              }),
              project: (values) => projectNotificationFeed(values, scope),
            },
            context,
          ),
        extend: (_scope, window, context) =>
          notificationService.nextFeedWindow(context.userId, window),
        same: sameKeyset,
      },
      ctx,
    ),
    [VIEW_CACHE_KEYS.calendarAgenda]: new PagedView<AgendaWindow>(
      {
        key: VIEW_CACHE_KEYS.calendarAgenda,
        warm: [agendaScope(ctx.now)],
        initial: () => ({ weeks: AGENDA_FEED_INITIAL_WEEKS }),
        open: (scope, window, context) => {
          const range = agendaSpan(scope, window);
          return startProjection(
            {
              sources: () => ({
                events: moduleGate.of(PRODUCTIVITY, calendarEventService.observeRange(range.from, range.to), []),
                reminders: sources.reminders,
                tasks: moduleGate.of(PRODUCTIVITY, projectTaskService.observeDueRange(range.from, range.to), []),
                eventsLater: moduleGate.of(PRODUCTIVITY, calendarEventService.observeAnyStartingAfter(range.to), false),
                tasksLater: moduleGate.of(PRODUCTIVITY, projectTaskService.observeAnyDueAfter(range.to), false),
              }),
              project: (values) => projectAgendaFeed(values, scope, range),
            },
            context,
          );
        },
        extend: (_scope, window) =>
          Promise.resolve({ weeks: window.weeks + AGENDA_FEED_STEP_WEEKS }),
        same: (left, right) => left.weeks === right.weeks,
      },
      ctx,
    ),
  };
}

class ViewCacheCoordinatorService {
  private userId: string | null = null;
  private sources: SessionSources | null = null;
  private subscriptions: Subscription[] = [];
  private calendarSubscription: Subscription | null = null;
  private calendarScope: string | null = null;
  private calendarAnchor: Date | null = null;
  private nextDayTimer: ReturnType<typeof setTimeout> | null = null;
  private paged: Record<PagedViewKey, IPagedView> | null = null;
  private readonly pageHolders = new Map<
    string,
    { key: PagedViewKey; scope: string; count: number }
  >();

  start(userId: number | string): void {
    const nextUserId = String(userId);
    if (this.userId === nextUserId) return;
    this.stop();
    this.userId = nextUserId;
    const sources = sessionSources(nextUserId);
    this.sources = sources;
    const paged = startPagedViews(sources, { userId: nextUserId, now: new Date() });
    this.paged = paged;
    for (const holder of this.pageHolders.values()) {
      for (let index = 0; index < holder.count; index += 1) paged[holder.key].watch(holder.scope);
    }
    this.refresh();
  }

  setActiveModules(ids: ReadonlySet<string> | null): void {
    moduleGate.set(ids);
  }

  watchPages(key: PagedViewKey, scope: string): void {
    const id = `${key}|${scope}`;
    const holder = this.pageHolders.get(id) ?? { key, scope, count: 0 };
    holder.count += 1;
    this.pageHolders.set(id, holder);
    this.paged?.[key].watch(scope);
  }

  releasePages(key: PagedViewKey, scope: string): void {
    const id = `${key}|${scope}`;
    const holder = this.pageHolders.get(id);
    if (!holder) return;
    holder.count -= 1;
    if (holder.count <= 0) this.pageHolders.delete(id);
    this.paged?.[key].release(scope);
  }

  extendPages(key: PagedViewKey, scope: string): Promise<boolean> {
    return this.paged ? this.paged[key].extend(scope) : Promise.resolve(false);
  }

  stop(): void {
    if (this.paged) Object.values(this.paged).forEach((view) => view.stop());
    this.paged = null;
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions = [];
    this.calendarSubscription?.unsubscribe();
    this.calendarSubscription = null;
    if (this.nextDayTimer) clearTimeout(this.nextDayTimer);
    this.nextDayTimer = null;
    this.calendarScope = null;
    this.calendarAnchor = null;
    this.sources = null;
    this.userId = null;
  }

  watchCalendarMonth(anchor: Date): void {
    const { sources, userId } = this;
    if (!sources || !userId) return;
    const scope = calendarMonthScope(anchor);
    this.calendarAnchor = anchor;
    if (scope === this.calendarScope) return;
    this.calendarSubscription?.unsubscribe();
    this.calendarScope = scope;
    const window = calendarWindow(anchor);
    this.calendarSubscription = startProjection(
      {
        sources: () => ({
          events: moduleGate.of(PRODUCTIVITY, calendarEventService.observeRange(window.from, window.to), []),
          reminders: sources.reminders,
          tasks: moduleGate.of(PRODUCTIVITY, projectTaskService.observeDueRange(window.from, window.to), []),
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
    this.watchCalendarMonth(this.calendarAnchor ?? now);
    this.nextDayTimer = setTimeout(() => this.refresh(), startOfNextDay(now) - now.getTime() + 1_000);
  }
}

export const viewCacheCoordinatorService = new ViewCacheCoordinatorService();
