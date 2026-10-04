import { describe, expect, test } from 'bun:test';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { CalendarEntry } from '@/core/types';
import type { ProjectionContext, ViewWrite } from '@/core/services/view-cache/projection';
import { activityLevels, projectActivity } from '@/core/services/view-cache/activity.projection';
import {
  calendarEntryState,
  calendarMonthScope,
  projectAgenda,
  projectCalendar,
} from '@/core/services/view-cache/calendar.projection';
import {
  CAMERA_SOURCE_COLUMNS,
  CAMERA_SOURCE_FIELDS,
  projectCameras,
  type CameraSource,
} from '@/core/services/view-cache/camera.projection';
import { projectNotifications } from '@/core/services/view-cache/notification.projection';
import { filterPeople, projectPeople } from '@/core/services/view-cache/people.projection';
import { projectProjects } from '@/core/services/view-cache/project.projection';
import { activityWindows, projectSummary } from '@/core/services/view-cache/summary.projection';
import { MOSAIC_COLUMNS, MOSAIC_ROWS } from '@/shared/constants/dashboard.constant';

const now = new Date(2026, 9, 15, 10, 30);
const ctx: ProjectionContext = { userId: '1', now };

const rowsOf = (writes: readonly ViewWrite[], key: string, scope?: string) => {
  const write = writes.find((item) => item.key === key && item.scope === scope);
  if (!write || !('rows' in write)) throw new Error(`no rows for ${key}`);
  return write.rows;
};

const valueOf = (writes: readonly ViewWrite[], key: string) => {
  const write = writes.find((item) => item.key === key);
  if (!write || !('value' in write)) throw new Error(`no value for ${key}`);
  return write.value;
};

const camera = (id: string, overrides: Partial<CameraSource> = {}): CameraSource => ({
  id,
  driver: 'tapo',
  icon: '',
  name: `Cam ${id}`,
  ip: '10.0.0.2',
  port: 554,
  username: 'admin',
  cloudUsername: '',
  manufacturer: 'tapo',
  model: 'C200',
  recordMode: 'events',
  retentionDays: null,
  isOnline: true,
  isEnabled: true,
  capabilities: [],
  config: {},
  ...overrides,
});

describe('camera projection', () => {
  test('one row per camera carries its zones, stream resolution and labels', () => {
    const writes = projectCameras({
      cameras: [camera('1'), camera('2', { icon: 'camera', manufacturer: '', isOnline: false })],
      zones: [
        { id: 'z1', cameraId: '1', name: 'Door', points: [], zoneType: 'alert', color: '#fff', isEnabled: true },
        { id: 'z2', cameraId: '1', name: 'Yard', points: [], zoneType: 'monitor', color: '#000', isEnabled: false },
      ],
      streams: [{ cameraId: '2', resolution: '1080p' }],
    });
    expect(writes).toHaveLength(1);
    const [first, second] = rowsOf(writes, 'camera.list') as ICameraCacheRow[];
    expect(first?.icon).toBe('video');
    expect(first?.modelLabel).toBe('tapo C200');
    expect(first?.zones.map((zone) => zone.id)).toEqual(['z1', 'z2']);
    expect(first?.resolution).toBe('');
    expect(second?.icon).toBe('camera');
    expect(second?.modelLabel).toBe('C200');
    expect(second?.zones).toEqual([]);
    expect(second?.resolution).toBe('1080p');
    expect(first?.streamPath).toBe('');
  });

  test('stream paths come from the config and never anything else in it', () => {
    const writes = projectCameras({
      cameras: [
        camera('1', { config: { streamPath: '/Streaming/Channels/101', subStreamPath: '/Streaming/Channels/102' } }),
        camera('2', { config: { streamPath: 7, password: 'secret' } }),
      ],
      zones: [],
      streams: [],
    });
    const [first, second] = rowsOf(writes, 'camera.list') as ICameraCacheRow[];
    expect(first?.streamPath).toBe('/Streaming/Channels/101');
    expect(first?.subStreamPath).toBe('/Streaming/Channels/102');
    expect(second?.streamPath).toBe('');
    expect(JSON.stringify(second)).not.toContain('secret');
  });

  test('a camera row carries the capabilities the server synced, so a driver change reaches the detail live', () => {
    const writes = projectCameras({
      cameras: [camera('6', { capabilities: ['ptz', 'presets', 'talk'] })],
      zones: [],
      streams: [],
    });
    const [patio] = rowsOf(writes, 'camera.list') as ICameraCacheRow[];
    expect(patio?.capabilities).toEqual(['ptz', 'presets', 'talk']);
  });

  test('the camera list watches every column its rows read', () => {
    expect(CAMERA_SOURCE_COLUMNS).toEqual(
      expect.arrayContaining(['driver', 'port', 'username', 'cloud_username', 'retention_days', 'capabilities', 'config', 'is_online']),
    );
    expect(CAMERA_SOURCE_COLUMNS).toHaveLength(CAMERA_SOURCE_FIELDS.length);
  });
});

describe('project projection', () => {
  test('tasks are scoped per project and cards carry progress', () => {
    const writes = projectProjects({
      projects: [
        { id: 'p1', name: 'Home', description: '', status: 'active' },
        { id: 'p2', name: 'Empty', description: '', status: 'active' },
      ],
      tasks: [
        { id: 't1', projectId: 'p1', title: 'a', status: 'done', priority: 'none', dueAt: null },
        { id: 't2', projectId: 'p1', title: 'b', status: 'todo', priority: 'high', dueAt: new Date(1000) },
      ],
    });
    expect(rowsOf(writes, 'project.tasks', 'p1')).toEqual([
      { id: 't1', projectId: 'p1', title: 'a', status: 'done', priority: 'none', dueAt: null },
      { id: 't2', projectId: 'p1', title: 'b', status: 'todo', priority: 'high', dueAt: 1000 },
    ]);
    expect(rowsOf(writes, 'project.tasks', 'p2')).toEqual([]);
    expect(rowsOf(writes, 'dashboard.projects')).toEqual([
      { id: 'p1', name: 'Home', description: '', status: 'active', done: 1, total: 2, progress: 0.5 },
      { id: 'p2', name: 'Empty', description: '', status: 'active', done: 0, total: 0, progress: 0 },
    ]);
  });
});

describe('people projection', () => {
  const user = (id: string, name: string, lastName: string, role: 'owner' | 'guard' | 'guest') => ({
    id,
    name,
    lastName,
    role,
    isActive: true,
    createdAt: new Date(2000),
    updatedAt: new Date(3000),
  });

  test('users keep millisecond stamps and invitations travel in seconds', () => {
    const writes = projectPeople({
      users: [user('1', 'Ana', 'Ruiz', 'owner')],
      invitations: [
        {
          id: '7',
          role: 'guest',
          maxRedemptions: 1,
          redemptionCount: 0,
          expiresAt: new Date(9_000),
          createdBy: '1',
          revokedAt: null,
          createdAt: new Date(4_500),
        },
      ],
    });
    expect(rowsOf(writes, 'people.users')).toEqual([
      { id: '1', name: 'Ana', lastName: 'Ruiz', role: 'owner', isActive: true, createdAt: 2000, updatedAt: 3000 },
    ]);
    expect(rowsOf(writes, 'people.invitations')).toEqual([
      { id: 7, role: 'guest', maxRedemptions: 1, redemptionCount: 0, expiresAt: 9, createdBy: 1, revokedAt: null, createdAt: 4 },
    ]);
  });

  test('the directory filters in memory by name, last name and role', () => {
    const rows = [
      { ...user('1', 'Ana', 'Ruiz', 'owner'), createdAt: 0, updatedAt: 0 },
      { ...user('2', 'Luis', 'Gómez', 'guard'), createdAt: 0, updatedAt: 0 },
    ];
    expect(filterPeople(rows, { query: '', role: 'all' })).toBe(rows);
    expect(filterPeople(rows, { query: 'gÓm', role: 'all' }).map((row) => row.id)).toEqual(['2']);
    expect(filterPeople(rows, { query: '', role: 'owner' }).map((row) => row.id)).toEqual(['1']);
    expect(filterPeople(rows, { query: 'guard', role: 'all' }).map((row) => row.id)).toEqual(['2']);
    expect(filterPeople(rows, { query: 'ana', role: 'guard' })).toEqual([]);
  });
});

describe('notification projection', () => {
  test('previews and the unread count', () => {
    const writes = projectNotifications({
      notifications: [
        {
          id: 'n1',
          type: 'camera',
          title: 'Hi',
          body: 'There',
          isRead: false,
          data: { cameraId: 7 },
          createdAt: new Date(1_790_000_000_000),
        },
      ],
      unread: 3,
    });
    expect(rowsOf(writes, 'dashboard.notifications')).toEqual([
      {
        id: 'n1',
        type: 'camera',
        title: 'Hi',
        body: 'There',
        isRead: false,
        data: { cameraId: 7 },
        createdAt: 1_790_000_000_000,
      },
    ]);
    expect(valueOf(writes, 'dashboard.unread')).toBe(3);
  });
});

describe('activity projection', () => {
  const at = (day: number, hour: number) => new Date(2026, 9, day, hour);

  test('the mosaic places today in the last column and scales to the peak', () => {
    const levels = activityLevels([{ occurredAt: at(15, 1) }, { occurredAt: at(15, 1) }, { occurredAt: at(14, 23) }], now);
    expect(levels).toHaveLength(MOSAIC_ROWS);
    expect(levels[0]).toHaveLength(MOSAIC_COLUMNS);
    expect(levels[0]?.[MOSAIC_COLUMNS - 1]).toBe(3);
    expect(levels[MOSAIC_ROWS - 1]?.[MOSAIC_COLUMNS - 2]).toBe(2);
  });

  test('an empty week is all zeros and future events are ignored', () => {
    const levels = activityLevels([{ occurredAt: at(16, 9) }], now);
    expect(levels.flat().every((value) => value === 0)).toBe(true);
  });

  test('recent events come newest first', () => {
    const writes = projectActivity(
      {
        events: [
          { id: 'old', summary: 'a', severity: 'info', occurredAt: at(10, 8) },
          { id: 'new', summary: 'b', severity: 'critical', occurredAt: at(15, 8) },
        ],
        mosaic: [],
      },
      ctx,
    );
    expect((rowsOf(writes, 'camera.events') as { id: string }[]).map((row) => row.id)).toEqual(['new', 'old']);
  });
});

describe('summary projection', () => {
  test('counts the two activity windows and open work', () => {
    const writes = projectSummary(
      {
        cameras: [
          { isOnline: true, isEnabled: true },
          { isOnline: true, isEnabled: false },
        ],
        reminders: [{ isCompleted: false }, { isCompleted: true }],
        projects: [{ status: 'active' }, { status: 'archived' }],
        tasks: [{ status: 'todo' }, { status: 'done' }, { status: 'canceled' }],
        eventsCurrent: 1,
        eventsPrevious: 2,
      },
    );
    expect(valueOf(writes, 'dashboard.summary')).toEqual({
      camerasTotal: 2,
      camerasOnline: 1,
      remindersPending: 1,
      projectsActive: 1,
      tasksOpen: 1,
      eventsCurrent: 1,
      eventsPrevious: 2,
    });
  });

  test('the two activity windows are back-to-back weeks that end tonight', () => {
    const { current, previous } = activityWindows(now);
    expect(current.from).toBe(new Date(2026, 9, 9).getTime());
    expect(current.to).toBe(new Date(2026, 9, 16).getTime());
    expect(previous.from).toBe(new Date(2026, 9, 2).getTime());
    expect(previous.to).toBe(current.from);
  });
});

describe('calendar projections', () => {
  const sources = {
    events: [
      {
        id: 'e1',
        title: 'Visit',
        startsAt: new Date(2026, 10, 20, 9),
        endsAt: null,
        isAllDay: false,
        color: '',
        location: '',
        description: '',
        projectId: null,
      },
    ],
    reminders: [{ id: 'r1', title: 'Pay', scheduledAt: new Date(2026, 9, 15, 18), isCompleted: false }],
    tasks: [{ id: 't1', title: 'Fix', dueAt: new Date(2026, 9, 15), status: 'doing', projectId: 'p1' }],
  };

  test('the active month and its neighbours are written as three scopes', () => {
    const writes = projectCalendar(sources, now);
    expect(writes.map((write) => write.scope)).toEqual(['month.2026-09', 'month.2026-10', 'month.2026-11']);
    expect((rowsOf(writes, 'calendar.entries', 'month.2026-11') as { id: string }[]).map((entry) => entry.id)).toEqual([
      'event:e1',
    ]);
    expect((rowsOf(writes, 'calendar.entries', 'month.2026-10') as { id: string }[]).map((entry) => entry.id)).toEqual([
      'task:t1',
      'reminder:r1',
    ]);
    expect(calendarMonthScope(now)).toBe('month.2026-10');
  });

  test("today's agenda keeps only today", () => {
    const entries = rowsOf(projectAgenda(sources, ctx), 'dashboard.agenda', 'today') as { id: string; status: string }[];
    expect(entries.map((entry) => [entry.id, entry.status])).toEqual([
      ['task:t1', 'active'],
      ['reminder:r1', 'upcoming'],
    ]);
  });
});

describe('calendar entry state', () => {
  const at = (hour: number, minute = 0, day = 15) => new Date(2026, 9, day, hour, minute).getTime();
  const entry = (overrides: Partial<CalendarEntry>): CalendarEntry => ({
    id: 'event:1',
    source: 'event',
    title: 'Visit',
    startsAt: at(9),
    endsAt: at(10),
    isAllDay: false,
    status: 'upcoming',
    ...overrides,
  });

  test('a timed event is upcoming, ongoing, then ended', () => {
    const event = entry({});
    expect(calendarEntryState(event, at(8, 59))).toBe('upcoming');
    expect(calendarEntryState(event, at(9))).toBe('ongoing');
    expect(calendarEntryState(event, at(9, 59))).toBe('ongoing');
    expect(calendarEntryState(event, at(10))).toBe('ended');
  });

  test('a timed event without an end stays ongoing for an hour', () => {
    const event = entry({ endsAt: null });
    expect(calendarEntryState(event, at(9, 30))).toBe('ongoing');
    expect(calendarEntryState(event, at(10, 1))).toBe('ended');
  });

  test('an all-day event is today on its days and ended after', () => {
    const single = entry({ isAllDay: true, startsAt: at(0), endsAt: null });
    expect(calendarEntryState(single, at(23, 59, 14))).toBe('upcoming');
    expect(calendarEntryState(single, at(0))).toBe('today');
    expect(calendarEntryState(single, at(23, 59))).toBe('today');
    expect(calendarEntryState(single, at(0, 0, 16))).toBe('ended');
    const spanning = entry({ isAllDay: true, startsAt: at(0), endsAt: at(0, 0, 17) });
    expect(calendarEntryState(spanning, at(12, 0, 16))).toBe('today');
    expect(calendarEntryState(spanning, at(0, 0, 18))).toBe('ended');
  });

  test('a reminder is upcoming, overdue once past, done when completed', () => {
    const reminder = entry({ id: 'reminder:1', source: 'reminder', endsAt: null });
    expect(calendarEntryState(reminder, at(8))).toBe('upcoming');
    expect(calendarEntryState(reminder, at(9))).toBe('overdue');
    expect(calendarEntryState({ ...reminder, status: 'complete' }, at(8))).toBe('done');
    expect(calendarEntryState({ ...reminder, status: 'complete' }, at(12))).toBe('done');
  });

  test('a task keeps its own status whatever the time', () => {
    const task = entry({ id: 'task:1', source: 'task', isAllDay: true, endsAt: null });
    expect(calendarEntryState(task, at(0, 0, 20))).toBe('todo');
    expect(calendarEntryState({ ...task, status: 'active' }, at(0, 0, 10))).toBe('doing');
    expect(calendarEntryState({ ...task, status: 'complete' }, at(0, 0, 20))).toBe('done');
  });

  test('the projected reminder turns overdue as time passes, with no new projection', () => {
    const [reminder] = rowsOf(
      projectAgenda(
        { events: [], reminders: [{ id: 'r1', title: 'Pay', scheduledAt: new Date(2026, 9, 15, 18), isCompleted: false }], tasks: [] },
        ctx,
      ),
      'dashboard.agenda',
      'today',
    ) as CalendarEntry[];
    if (!reminder) throw new Error('no reminder');
    expect(calendarEntryState(reminder, at(17))).toBe('upcoming');
    expect(calendarEntryState(reminder, at(18, 1))).toBe('overdue');
  });
});
