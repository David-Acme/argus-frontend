import { auditTime, combineLatest, type Subscription } from 'rxjs';
import type {
  ICameraCacheRow,
  ICameraDetailCache,
  ICameraListCacheRow,
  IDashboardCameraCacheRow,
  IInvitationRecord,
  INotificationPreviewCacheRow,
  IPeopleDirectoryFilter,
  IPeopleDirectoryCacheRow,
  IProjectCacheRow,
  IProjectTaskCacheRow,
  IZoneCacheRow,
} from '@/core/interfaces';
import type { CalendarEntry, DashboardProjectCard, DashboardSummary, IconName } from '@/core/types';
import { cameraService } from '@/core/services/camera.service';
import { cameraStreamService } from '@/core/services/camera-stream.service';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { eventService } from '@/core/services/event.service';
import { notificationService } from '@/core/services/notification.service';
import { projectService } from '@/core/services/project.service';
import { projectTaskService } from '@/core/services/project-task.service';
import { reminderService } from '@/core/services/reminder.service';
import { userInvitationService } from '@/core/services/user-invitation.service';
import { userService } from '@/core/services/user.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { zoneService } from '@/core/services/zone.service';
import {
  ACTIVITY_WINDOW_DAYS,
  EVENT_SAMPLE_LIMIT,
  MOSAIC_COLUMNS,
  MOSAIC_ROWS,
  VIEW_CACHE_CALENDAR_ENTRY_LIMIT,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import {
  calendarMonthRange,
  calendarMonthScope,
  toCalendarEntries,
} from './view-cache-projections.service';

const DAY_MS = 86_400_000;
const BAND_HOURS = 24 / MOSAIC_ROWS;
const NOTIFICATION_PREVIEW_LIMIT = 8;
const PROJECTION_REFRESH_MS = 120;

const startOfDay = (value: Date): number =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

const endOfDay = (value: Date): number => startOfDay(value) + DAY_MS - 1;

const emptyLevels = (): number[][] =>
  Array.from({ length: MOSAIC_ROWS }, () => Array.from({ length: MOSAIC_COLUMNS }, () => 0));

class ViewCacheCoordinatorService {
  private userId: string | null = null;
  private coreSubscription: Subscription | null = null;
  private dashboardAgendaSubscription: Subscription | null = null;
  private calendarSubscription: Subscription | null = null;
  private calendarScope: string | null = null;
  private nextDayTimer: ReturnType<typeof setTimeout> | null = null;
  private peopleFilterRequest = 0;

  start(userId: number | string): void {
    const nextUserId = String(userId);
    if (this.userId === nextUserId) return;

    this.stop();
    this.userId = nextUserId;
    this.observeCoreViews(nextUserId);
    this.observeDashboardAgenda(nextUserId);
    this.watchCalendarMonth(new Date());
    this.scheduleNextDayRefresh();
  }

  stop(): void {
    this.peopleFilterRequest += 1;
    this.coreSubscription?.unsubscribe();
    this.coreSubscription = null;
    this.dashboardAgendaSubscription?.unsubscribe();
    this.dashboardAgendaSubscription = null;
    this.calendarSubscription?.unsubscribe();
    this.calendarSubscription = null;
    if (this.nextDayTimer) clearTimeout(this.nextDayTimer);
    this.nextDayTimer = null;
    this.calendarScope = null;
    this.userId = null;
  }

  /** Called by the schedule screen when its anchor enters another month. */
  watchCalendarMonth(anchor: Date): void {
    if (!this.userId) return;
    const scope = calendarMonthScope(anchor);
    if (scope === this.calendarScope) return;

    this.calendarSubscription?.unsubscribe();
    this.calendarScope = scope;
    const range = calendarMonthRange(anchor);
    this.calendarSubscription = combineLatest({
      events: calendarEventService.observeRange(range.from, range.to),
      reminders: reminderService.observeForUser(this.userId),
      tasks: projectTaskService.observeDueRange(range.from, range.to),
    })
      .pipe(auditTime(PROJECTION_REFRESH_MS))
      .subscribe(({ events, reminders, tasks }) => {
      const entries = toCalendarEntries(events, reminders, tasks, range.from, range.to);
      viewCacheService.write(VIEW_CACHE_KEYS.calendarEntries, entries, scope, {
        limit: VIEW_CACHE_CALENDAR_ENTRY_LIMIT,
        replaceScoped: true,
      });
    });
  }

  /** Keeps the previous MMKV result visible until this database filter resolves. */
  async filterPeople(filter: IPeopleDirectoryFilter): Promise<void> {
    if (!this.userId) return;
    const request = this.peopleFilterRequest + 1;
    this.peopleFilterRequest = request;
    const users = await userService.filterDirectory(filter);
    if (request !== this.peopleFilterRequest) return;
    const rows: IPeopleDirectoryCacheRow[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    }));
    viewCacheService.write(VIEW_CACHE_KEYS.peopleFilter, rows);
  }

  private observeCoreViews(userId: string): void {
    this.coreSubscription?.unsubscribe();
    const subscription = combineLatest({
      cameras: cameraService.observeList(),
      zones: zoneService.observeForCache(),
      streams: cameraStreamService.observePrimaries(),
      projects: projectService.observeList(),
      tasks: projectTaskService.observeAll(),
      reminders: reminderService.observeForUser(userId),
      notifications: notificationService.observeForUser(userId, NOTIFICATION_PREVIEW_LIMIT),
      unread: notificationService.observeUnreadCountForUser(userId),
      events: eventService.observeRecent(EVENT_SAMPLE_LIMIT),
      users: userService.observeDirectory(),
      invitations: userInvitationService.observeList(),
    })
      .pipe(auditTime(PROJECTION_REFRESH_MS))
      .subscribe(
      ({
        cameras,
        zones,
        streams,
        projects,
        tasks,
        reminders,
        notifications,
        unread,
        events,
        users,
        invitations,
      }) => {
        const zonesByCamera = new Map<string, number>();
        for (const zone of zones) {
          zonesByCamera.set(zone.cameraId, (zonesByCamera.get(zone.cameraId) ?? 0) + 1);
        }
        const cameraRows: ICameraListCacheRow[] = cameras.map((camera) => ({
          id: camera.id,
          icon: (camera.icon || 'video') as IconName,
          name: camera.name,
          ip: camera.ip,
          model: [camera.manufacturer, camera.model].filter(Boolean).join(' '),
          isOnline: camera.isOnline,
          isEnabled: camera.isEnabled,
          zones: zonesByCamera.get(camera.id) ?? 0,
        }));
        viewCacheService.write(VIEW_CACHE_KEYS.cameraList, cameraRows);

        const cameraDetails: ICameraCacheRow[] = cameras.map((camera) => ({
          id: camera.id,
          driver: camera.driver,
          icon: camera.icon,
          name: camera.name,
          ip: camera.ip,
          port: camera.port,
          username: camera.username,
          cloudUsername: camera.cloudUsername,
          manufacturer: camera.manufacturer,
          model: camera.model,
          recordMode: camera.recordMode,
          retentionDays: camera.retentionDays,
          isOnline: camera.isOnline,
          isEnabled: camera.isEnabled,
        }));
        const zoneRows: IZoneCacheRow[] = zones.map((zone) => ({
          id: zone.id,
          cameraId: zone.cameraId,
          name: zone.name,
          points: zone.points,
          zoneType: zone.zoneType,
          color: zone.color,
          isEnabled: zone.isEnabled,
        }));
        for (const camera of cameraDetails) {
          const detail: ICameraDetailCache = {
            camera,
            zones: zoneRows.filter((zone) => zone.cameraId === camera.id),
          };
          viewCacheService.writeValue(VIEW_CACHE_KEYS.cameraDetail, detail, camera.id);
        }

        const resolutionByCamera = new Map(
          streams.map((stream) => [stream.cameraId, stream.resolution]),
        );
        const dashboardCameras: IDashboardCameraCacheRow[] = cameras.map((camera) => ({
          id: camera.id,
          name: camera.name,
          model: [camera.manufacturer, camera.model].filter(Boolean).join(' '),
          ip: camera.ip,
          isOnline: camera.isOnline,
          isEnabled: camera.isEnabled,
          resolution: resolutionByCamera.get(camera.id) || undefined,
          recordMode: camera.recordMode || undefined,
        }));
        viewCacheService.write(VIEW_CACHE_KEYS.dashboardCameras, dashboardCameras);

        const projectRows: IProjectCacheRow[] = projects.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
        }));
        viewCacheService.write(VIEW_CACHE_KEYS.projectList, projectRows);

        const taskRows: IProjectTaskCacheRow[] = tasks.map((task) => ({
          id: task.id,
          projectId: task.projectId,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueAt: task.dueAt?.getTime() ?? null,
        }));
        for (const project of projectRows) {
          viewCacheService.write(
            VIEW_CACHE_KEYS.projectTasks,
            taskRows.filter((task) => task.projectId === project.id),
            project.id,
          );
        }

        const projectProgress = new Map<string, { done: number; total: number }>();
        for (const task of taskRows) {
          const progress = projectProgress.get(task.projectId) ?? { done: 0, total: 0 };
          progress.total += 1;
          if (task.status === 'done') progress.done += 1;
          projectProgress.set(task.projectId, progress);
        }
        const dashboardProjects: DashboardProjectCard[] = projectRows.map((project) => {
          const progress = projectProgress.get(project.id) ?? { done: 0, total: 0 };
          return {
            ...project,
            done: progress.done,
            total: progress.total,
            progress: progress.total > 0 ? progress.done / progress.total : 0,
          };
        });
        viewCacheService.write(VIEW_CACHE_KEYS.dashboardProjects, dashboardProjects);

        const people: IPeopleDirectoryCacheRow[] = users.map((user) => ({
          id: user.id,
          name: user.name,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt.getTime(),
          updatedAt: user.updatedAt.getTime(),
        }));
        viewCacheService.write(VIEW_CACHE_KEYS.peopleUsers, people);

        const invitationRows: IInvitationRecord[] = invitations.map((invitation) => ({
          id: Number(invitation.id),
          role: invitation.role,
          maxRedemptions: invitation.maxRedemptions,
          redemptionCount: invitation.redemptionCount,
          expiresAt: Math.floor(invitation.expiresAt.getTime() / 1000),
          createdBy: Number(invitation.createdBy),
          revokedAt: invitation.revokedAt
            ? Math.floor(invitation.revokedAt.getTime() / 1000)
            : null,
          createdAt: Math.floor(invitation.createdAt.getTime() / 1000),
        }));
        viewCacheService.write(VIEW_CACHE_KEYS.peopleInvitations, invitationRows);

        const notificationRows: INotificationPreviewCacheRow[] = notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          isRead: notification.isRead,
        }));
        viewCacheService.write(VIEW_CACHE_KEYS.dashboardNotifications, notificationRows);
        viewCacheService.writeValue(VIEW_CACHE_KEYS.dashboardUnread, unread);

        const today = startOfDay(new Date());
        const since = today - (ACTIVITY_WINDOW_DAYS - 1) * DAY_MS;
        const previousSince = since - ACTIVITY_WINDOW_DAYS * DAY_MS;
        let eventsCurrent = 0;
        let eventsPrevious = 0;
        for (const event of events) {
          const occurredAt = event.occurredAt.getTime();
          if (occurredAt >= since) eventsCurrent += 1;
          else if (occurredAt >= previousSince) eventsPrevious += 1;
        }
        const summary: DashboardSummary = {
          camerasTotal: cameras.length,
          camerasOnline: cameras.filter((camera) => camera.isEnabled && camera.isOnline).length,
          remindersPending: reminders.filter((reminder) => !reminder.isCompleted).length,
          projectsActive: projectRows.filter((project) => project.status !== 'archived').length,
          tasksOpen: taskRows.filter((task) => task.status !== 'done').length,
          eventsCurrent,
          eventsPrevious,
        };
        viewCacheService.writeValue(VIEW_CACHE_KEYS.dashboardSummary, summary);
        viewCacheService.write(VIEW_CACHE_KEYS.dashboardActivity, this.activityLevels(events, today));
      },
    );
    this.coreSubscription = subscription;
  }

  private observeDashboardAgenda(userId: string): void {
    this.dashboardAgendaSubscription?.unsubscribe();
    const today = new Date();
    const from = startOfDay(today);
    const to = endOfDay(today);
    const subscription = combineLatest({
      events: calendarEventService.observeRange(from, to),
      reminders: reminderService.observeForUser(userId),
      tasks: projectTaskService.observeDueRange(from, to),
    })
      .pipe(auditTime(PROJECTION_REFRESH_MS))
      .subscribe(({ events, reminders, tasks }) => {
      const entries: CalendarEntry[] = toCalendarEntries(events, reminders, tasks, from, to);
      viewCacheService.write(VIEW_CACHE_KEYS.dashboardAgenda, entries, 'today', {
        limit: VIEW_CACHE_CALENDAR_ENTRY_LIMIT,
        replaceScoped: true,
      });
    });
    this.dashboardAgendaSubscription = subscription;
  }

  private scheduleNextDayRefresh(): void {
    if (!this.userId) return;
    const now = Date.now();
    const next = startOfDay(new Date(now)) + DAY_MS;
    this.nextDayTimer = setTimeout(() => {
      const userId = this.userId;
      if (!userId) return;
      this.observeCoreViews(userId);
      this.observeDashboardAgenda(userId);
      this.watchCalendarMonth(new Date());
      this.scheduleNextDayRefresh();
    }, Math.max(1_000, next - now + 1_000));
  }

  private activityLevels(events: readonly { occurredAt: Date }[], today: number): number[][] {
    const counts = emptyLevels();
    let peak = 0;
    for (const event of events) {
      const occurredAt = event.occurredAt.getTime();
      const dayOffset = Math.floor((today - startOfDay(new Date(occurredAt))) / DAY_MS);
      if (dayOffset < 0 || dayOffset >= MOSAIC_COLUMNS) continue;
      const column = MOSAIC_COLUMNS - 1 - dayOffset;
      const row = Math.min(MOSAIC_ROWS - 1, Math.floor(new Date(occurredAt).getHours() / BAND_HOURS));
      counts[row][column] += 1;
      peak = Math.max(peak, counts[row][column]);
    }
    return peak === 0
      ? counts
      : counts.map((row) => row.map((value) => Math.ceil((value / peak) * 3)));
  }
}

export const viewCacheCoordinatorService = new ViewCacheCoordinatorService();
