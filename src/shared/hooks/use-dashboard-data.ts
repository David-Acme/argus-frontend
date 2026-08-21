import { useMemo } from 'react';
import { cameraService } from '@/core/services/camera.service';
import { cameraStreamService } from '@/core/services/camera-stream.service';
import { eventService } from '@/core/services/event.service';
import { notificationService } from '@/core/services/notification.service';
import { projectService } from '@/core/services/project.service';
import { projectTaskService } from '@/core/services/project-task.service';
import { reminderService } from '@/core/services/reminder.service';
import type { CalendarEntry, DashboardProjectCard, DashboardSummary } from '@/core/types';
import type { CameraGridItem, NotificationPreview } from '@/shared/components/dashboard';
import {
  ACTIVITY_WINDOW_DAYS,
  EVENT_SAMPLE_LIMIT,
  MOSAIC_COLUMNS,
  MOSAIC_ROWS,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { endOfDay, startOfDay } from '@/shared/libs/calendar';
import { useCachedRows, useCachedValue } from './use-cached-rows';
import { useCalendarEntries } from './use-calendar-entries';
import { useObservableReady } from './use-observable';

/** Enough rows to fill the notification panel; the inbox screen reads the rest. */
const NOTIFICATION_PREVIEW_LIMIT = 8;
const DAY_MS = 86_400_000;
const BAND_HOURS = 24 / MOSAIC_ROWS;

type DashboardData = {
  cameraTiles: readonly CameraGridItem[];
  projects: readonly DashboardProjectCard[];
  /** Everything scheduled for today: events, reminders and due tasks. */
  today: readonly CalendarEntry[];
  notifications: readonly NotificationPreview[];
  unreadNotifications: number;
  summary: DashboardSummary;
  /** Rows of tint levels (0..3): time-of-day bands over the last days. */
  activityLevels: readonly (readonly number[])[];
};

function emptyLevels(): number[][] {
  return Array.from({ length: MOSAIC_ROWS }, () => Array.from({ length: MOSAIC_COLUMNS }, () => 0));
}

/**
 * Reads the local synchronized projection the dashboard renders, already shaped
 * for the cards. Everything returned is plain data, so the last visit can be
 * rehydrated from storage and the screen paints filled on the first frame.
 */
export function useDashboardData(userId: number | null): DashboardData {
  const userKey = userId == null ? '' : String(userId);
  const today = useMemo(() => {
    const now = new Date();
    return { from: startOfDay(now).getTime(), to: endOfDay(now).getTime() };
  }, []);

  const [cameras, camerasReady] = useObservableReady(() => cameraService.observeList(), [], []);
  const [primaryStreams] = useObservableReady(() => cameraStreamService.observePrimaries(), [], []);
  const [reminders, remindersReady] = useObservableReady(
    () => reminderService.observeForUser(userKey),
    [],
    [userKey]
  );
  const [notificationRows, notificationsReady] = useObservableReady(
    () => notificationService.observeForUser(userKey, NOTIFICATION_PREVIEW_LIMIT),
    [],
    [userKey]
  );
  const [unread, unreadReady] = useObservableReady(
    () => notificationService.observeUnreadCountForUser(userKey),
    0,
    [userKey]
  );
  const [projectRows, projectsReady] = useObservableReady(
    () => projectService.observeList(),
    [],
    []
  );
  const [taskRows, tasksReady] = useObservableReady(() => projectTaskService.observeAll(), [], []);
  const [events, eventsReady] = useObservableReady(
    () => eventService.observeRecent(EVENT_SAMPLE_LIMIT),
    [],
    []
  );

  const { entries: todayEntries, ready: todayReady } = useCalendarEntries({
    from: today.from,
    to: today.to,
    userId: userKey,
  });

  const liveTiles = useMemo<CameraGridItem[]>(() => {
    const resolutionByCamera = new Map(
      primaryStreams.map((stream) => [stream.cameraId, stream.resolution])
    );
    return cameras.map((camera) => ({
      id: camera.id,
      name: camera.name,
      model: [camera.manufacturer, camera.model].filter(Boolean).join(' '),
      ip: camera.ip,
      isOnline: camera.isOnline,
      isEnabled: camera.isEnabled,
      resolution: resolutionByCamera.get(camera.id) || undefined,
      recordMode: camera.recordMode || undefined,
    }));
  }, [cameras, primaryStreams]);

  const liveProjects = useMemo<DashboardProjectCard[]>(() => {
    const byProject = new Map<string, { done: number; total: number }>();
    for (const task of taskRows) {
      const bucket = byProject.get(task.projectId) ?? { done: 0, total: 0 };
      bucket.total += 1;
      if (task.status === 'done') bucket.done += 1;
      byProject.set(task.projectId, bucket);
    }
    return projectRows.map((project) => {
      const counts = byProject.get(project.id) ?? { done: 0, total: 0 };
      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
        status: project.status,
        done: counts.done,
        total: counts.total,
        progress: counts.total > 0 ? counts.done / counts.total : 0,
      };
    });
  }, [projectRows, taskRows]);

  const liveNotifications = useMemo<NotificationPreview[]>(
    () =>
      notificationRows.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        isRead: notification.isRead,
      })),
    [notificationRows]
  );

  const liveSummary = useMemo<DashboardSummary>(() => {
    // Windows are anchored to the start of today, not to "now", so the counts
    // stay stable while the screen is open.
    const since = today.from - (ACTIVITY_WINDOW_DAYS - 1) * DAY_MS;
    const previousSince = since - ACTIVITY_WINDOW_DAYS * DAY_MS;
    let current = 0;
    let previous = 0;
    for (const event of events) {
      const at = event.occurredAt.getTime();
      if (at >= since) current += 1;
      else if (at >= previousSince) previous += 1;
    }
    return {
      camerasTotal: cameras.length,
      camerasOnline: cameras.filter((camera) => camera.isEnabled && camera.isOnline).length,
      remindersPending: reminders.filter((reminder) => !reminder.isCompleted).length,
      projectsActive: projectRows.filter((project) => project.status !== 'archived').length,
      tasksOpen: taskRows.filter((task) => task.status !== 'done').length,
      eventsCurrent: current,
      eventsPrevious: previous,
    };
  }, [cameras, events, projectRows, reminders, taskRows, today.from]);

  const liveLevels = useMemo(() => {
    const counts = emptyLevels();
    const startOfToday = today.from;
    let peak = 0;
    for (const event of events) {
      const at = event.occurredAt.getTime();
      const dayOffset = Math.floor((startOfToday - startOfDay(new Date(at)).getTime()) / DAY_MS);
      if (dayOffset < 0 || dayOffset >= MOSAIC_COLUMNS) continue;
      const column = MOSAIC_COLUMNS - 1 - dayOffset;
      const row = Math.min(MOSAIC_ROWS - 1, Math.floor(new Date(at).getHours() / BAND_HOURS));
      counts[row][column] += 1;
      peak = Math.max(peak, counts[row][column]);
    }
    if (peak === 0) return counts;
    return counts.map((row) => row.map((value) => Math.ceil((value / peak) * 3)));
  }, [events, today.from]);

  const cameraTiles = useCachedRows(VIEW_CACHE_KEYS.dashboardCameras, liveTiles, camerasReady);
  const projects = useCachedRows(VIEW_CACHE_KEYS.dashboardProjects, liveProjects, projectsReady);
  const notifications = useCachedRows(
    VIEW_CACHE_KEYS.dashboardNotifications,
    liveNotifications,
    notificationsReady,
    userKey
  );
  const todayRows = useCachedRows(
    VIEW_CACHE_KEYS.dashboardAgenda,
    todayEntries,
    todayReady,
    userKey
  );
  const summary = useCachedValue(
    VIEW_CACHE_KEYS.dashboardSummary,
    liveSummary,
    camerasReady && remindersReady && projectsReady && tasksReady && eventsReady,
    userKey
  );
  const activityLevels = useCachedRows(
    VIEW_CACHE_KEYS.dashboardActivity,
    liveLevels,
    eventsReady
  ) as readonly (readonly number[])[];
  const unreadNotifications = useCachedValue(
    VIEW_CACHE_KEYS.dashboardUnread,
    unread,
    unreadReady,
    userKey
  );

  return {
    cameraTiles,
    projects,
    today: todayRows,
    notifications,
    unreadNotifications,
    summary,
    activityLevels,
  };
}
