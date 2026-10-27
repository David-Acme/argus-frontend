import { describe, expect, test } from 'bun:test';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { CalendarEntry } from '@/core/types';
import type { ProjectionContext, ViewWrite } from '@/core/services/view-cache/projection';
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
import { projectNotificationFeed } from '@/core/services/view-cache/notification.projection';
import { projectPeople } from '@/core/services/view-cache/people.projection';
import {
  projectProjects,
  projectTasksPage,
  projectWeekTasks,
} from '@/core/services/view-cache/project.projection';
import { projectSummary } from '@/core/services/view-cache/summary.projection';
import { VIEW_CACHE_PAGE_SIZE } from '@/shared/constants/cache.constant';

const now = new Date(2026, 9, 15, 10, 30);
const ctx: ProjectionContext = { userId: '1', now };

const rowsOf = (writes: readonly ViewWrite[], key: string, scope?: string) => {
  const write = writes.find((item) => item.key === key && item.scope === scope);
  if (!write || !('rows' in write)) throw new Error(`no rows for ${key}`);
  return write.rows;
};

const valueOf = (writes: readonly ViewWrite[], key: string, scope?: string) => {
  const write = writes.find(
    (item) => item.key === key && (scope === undefined || item.scope === scope)
  );
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
  privacyState: 'unknown',
  privacyObeyed: false,
  watchman: false,
  noAudio: false,
  retentionDays: null,
  isOnline: true,
  isEnabled: true,
  capabilities: [],
  config: {},
  ...overrides,
});

describe('camera projection', () => {
  test('one row per camera carries its zones and labels', () => {
    const writes = projectCameras({
      cameras: [camera('1'), camera('2', { icon: 'camera', manufacturer: '', isOnline: false })],
      zones: [
        {
          id: 'z1',
          cameraId: '1',
          name: 'Door',
          points: [],
          zoneType: 'alert',
          color: '#fff',
          isEnabled: true,
        },
        {
          id: 'z2',
          cameraId: '1',
          name: 'Yard',
          points: [],
          zoneType: 'monitor',
          color: '#000',
          isEnabled: false,
        },
      ],
    });
    expect(writes).toHaveLength(1);
    const [first, second] = rowsOf(writes, 'camera.list') as ICameraCacheRow[];
    expect(first?.icon).toBe('video');
    expect(first?.modelLabel).toBe('tapo C200');
    expect(first?.zones.map((zone) => zone.id)).toEqual(['z1', 'z2']);
    expect(second?.icon).toBe('camera');
    expect(second?.modelLabel).toBe('C200');
    expect(second?.zones).toEqual([]);
    expect(first?.streamPath).toBe('');
  });

  test('stream paths come from the config and never anything else in it', () => {
    const writes = projectCameras({
      cameras: [
        camera('1', {
          config: {
            streamPath: '/Streaming/Channels/101',
            subStreamPath: '/Streaming/Channels/102',
          },
        }),
        camera('2', { config: { streamPath: 7, password: 'secret' } }),
      ],
      zones: [],
    });
    const [first, second] = rowsOf(writes, 'camera.list') as ICameraCacheRow[];
    expect(first?.streamPath).toBe('/Streaming/Channels/101');
    expect(first?.subStreamPath).toBe('/Streaming/Channels/102');
    expect(second?.streamPath).toBe('');
    expect(JSON.stringify(second)).not.toContain('secret');
  });

  test('the incident retention flag comes from the config, and a stripped row reads as no incident', () => {
    const writes = projectCameras({
      cameras: [
        camera('1', { retentionDays: 90, config: { retentionIncident: true } }),
        camera('2', { ip: '', port: 0, username: '', cloudUsername: '', config: {} }),
        camera('3', { config: { retentionIncident: 'yes' } }),
      ],
      zones: [],
    });
    const [incident, stripped, odd] = rowsOf(writes, 'camera.list') as ICameraCacheRow[];
    expect(incident?.retentionIncident).toBe(true);
    expect(incident?.retentionDays).toBe(90);
    expect(stripped?.retentionIncident).toBe(false);
    expect(stripped?.ip).toBe('');
    expect(odd?.retentionIncident).toBe(false);
  });

  test('the aim settings come from the config so the toggles paint before the camera answers', () => {
    const writes = projectCameras({
      cameras: [
        camera('1', {
          config: {
            homePreset: '3',
            activeLook: true,
            followIntruders: true,
            noAimSectors: [
              { name: 'Vecino', panFrom: -40, panTo: -10, tiltFrom: -5, tiltTo: 20 },
              { name: 'roto', panFrom: 'a' },
            ],
          },
        }),
        camera('2', { config: {} }),
      ],
      zones: [],
    });
    const [aimed, plain] = rowsOf(writes, 'camera.list') as ICameraCacheRow[];
    expect(aimed?.aim).toEqual({
      homePreset: '3',
      activeLook: true,
      followIntruders: true,
      noAimSectors: [{ name: 'Vecino', panFrom: -40, panTo: -10, tiltFrom: -5, tiltTo: 20 }],
    });
    expect(plain?.aim).toEqual({
      homePreset: null,
      activeLook: false,
      followIntruders: false,
      noAimSectors: [],
    });
  });

  test('a camera row carries the capabilities the server synced, so a driver change reaches the detail live', () => {
    const writes = projectCameras({
      cameras: [camera('6', { capabilities: ['ptz', 'presets', 'talk'] })],
      zones: [],
    });
    const [patio] = rowsOf(writes, 'camera.list') as ICameraCacheRow[];
    expect(patio?.capabilities).toEqual(['ptz', 'presets', 'talk']);
  });

  test('the camera list watches every column its rows read', () => {
    expect(CAMERA_SOURCE_COLUMNS).toEqual(
      expect.arrayContaining([
        'driver',
        'port',
        'username',
        'cloud_username',
        'retention_days',
        'capabilities',
        'config',
        'is_online',
      ])
    );
    expect(CAMERA_SOURCE_COLUMNS).toHaveLength(CAMERA_SOURCE_FIELDS.length);
  });
});

const TASK_ROWS = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'a',
    status: 'done',
    priority: 'none',
    dueAt: null,
    createdVia: 'assistant',
  },
  {
    id: 't2',
    projectId: 'p1',
    title: 'b',
    status: 'todo',
    priority: 'high',
    dueAt: 1000,
    createdVia: 'app',
  },
];

describe('project projection', () => {
  test('members are scoped per project and cards carry the counted progress', () => {
    const writes = projectProjects({
      projects: [
        { id: 'p1', ownerId: '1', name: 'Home', description: '', status: 'active' },
        { id: 'p2', ownerId: '2', name: 'Empty', description: '', status: 'active' },
      ],
      progress: new Map([['p1', { done: 1, total: 2 }]]),
      members: [
        { id: 'm1', projectId: 'p1', userId: '2', access: 'edit' },
        { id: 'm2', projectId: 'p1', userId: '9', access: 'view' },
      ],
      users: [
        { id: '1', name: 'Ana', lastName: 'Ruiz' },
        { id: '2', name: 'Luis', lastName: '' },
      ],
    });
    expect(rowsOf(writes, 'project.list')).toEqual([
      { id: 'p1', ownerId: '1', name: 'Home', description: '', status: 'active' },
      { id: 'p2', ownerId: '2', name: 'Empty', description: '', status: 'active' },
    ]);
    expect(writes.some((write) => write.key === 'project.tasks')).toBe(false);
    expect(rowsOf(writes, 'project.members', 'p1')).toEqual([
      { id: 'm1', projectId: 'p1', userId: '2', name: 'Luis', access: 'edit' },
      { id: 'm2', projectId: 'p1', userId: '9', name: '', access: 'view' },
    ]);
    expect(rowsOf(writes, 'project.members', 'p2')).toEqual([]);
    expect(rowsOf(writes, 'dashboard.projects')).toEqual([
      {
        id: 'p1',
        ownerId: '1',
        name: 'Home',
        description: '',
        status: 'active',
        done: 1,
        total: 2,
        progress: 0.5,
      },
      {
        id: 'p2',
        ownerId: '2',
        name: 'Empty',
        description: '',
        status: 'active',
        done: 0,
        total: 0,
        progress: 0,
      },
    ]);
  });

  test('a project page carries its open tasks, a page of finished ones and the counts', () => {
    const [open, done] = [
      {
        id: 't2',
        projectId: 'p1',
        title: 'b',
        status: 'todo',
        priority: 'high',
        dueAt: new Date(1000),
        createdVia: '',
      },
      {
        id: 't1',
        projectId: 'p1',
        title: 'a',
        status: 'done',
        priority: 'none',
        dueAt: null,
        createdVia: 'assistant',
      },
    ];
    const writes = projectTasksPage(
      {
        open: [open],
        done: { rows: [done], hasMore: true },
        counts: { done: 41, total: 42, closed: 45 },
      },
      'p1'
    );
    expect(valueOf(writes, 'project.tasks', 'p1')).toEqual({
      rows: [TASK_ROWS[0]],
      hasMore: true,
      open: [TASK_ROWS[1]],
      doneTotal: 45,
      progress: { done: 41, total: 42 },
    });
  });

  test('the week reads counted tasks due in it', () => {
    expect(valueOf(projectWeekTasks({ counts: { open: 3, done: 2 } }), 'week.tasks')).toEqual({
      done: 2,
      pending: 3,
    });
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
      {
        id: '1',
        name: 'Ana',
        lastName: 'Ruiz',
        role: 'owner',
        isActive: true,
        createdAt: 2000,
        updatedAt: 3000,
      },
    ]);
    expect(rowsOf(writes, 'people.invitations')).toEqual([
      {
        id: 7,
        role: 'guest',
        maxRedemptions: 1,
        redemptionCount: 0,
        expiresAt: 9,
        createdBy: 1,
        revokedAt: null,
        revokedReason: null,
        revokedModule: null,
        createdAt: 4,
      },
    ]);
  });
});

describe('notification projection', () => {
  const source = {
    id: 'n1',
    type: 'camera',
    title: 'Hi',
    body: 'There',
    isRead: false,
    data: { cameraId: 7 },
    createdAt: new Date(1_790_000_000_000),
  };
  const row = {
    id: 'n1',
    type: 'camera',
    title: 'Hi',
    body: 'There',
    isRead: false,
    data: { cameraId: 7 },
    createdAt: 1_790_000_000_000,
  };

  test('the feed window, the dashboard previews and the unread count', () => {
    const writes = projectNotificationFeed(
      { page: { rows: [source], hasMore: true }, unread: 3 },
      'all'
    );
    expect(valueOf(writes, 'notification.feed', 'all')).toEqual({ rows: [row], hasMore: true });
    expect(rowsOf(writes, 'dashboard.notifications')).toEqual([row]);
    expect(valueOf(writes, 'dashboard.unread')).toBe(3);
  });

  test('the dashboard keeps one page however far the feed was scrolled', () => {
    const rows = Array.from({ length: VIEW_CACHE_PAGE_SIZE + 25 }, (_, index) => ({
      ...source,
      id: `n${index}`,
    }));
    const writes = projectNotificationFeed({ page: { rows, hasMore: false }, unread: 0 }, 'all');
    expect(rowsOf(writes, 'dashboard.notifications')).toHaveLength(VIEW_CACHE_PAGE_SIZE);
    expect((valueOf(writes, 'notification.feed', 'all') as { rows: unknown[] }).rows).toHaveLength(
      rows.length
    );
  });

  test('a notification deleted on another device leaves the feed, the previews and the unread count', () => {
    const kept = { ...source, id: 'n2', title: 'Kept', isRead: true };
    const before = projectNotificationFeed(
      { page: { rows: [source, kept], hasMore: false }, unread: 1 },
      'all'
    );
    expect(
      rowsOf(before, 'dashboard.notifications').map((item) => (item as { id: string }).id)
    ).toEqual(['n1', 'n2']);

    const after = projectNotificationFeed(
      { page: { rows: [kept], hasMore: false }, unread: 0 },
      'all'
    );
    const keptRow = { ...row, id: 'n2', title: 'Kept', isRead: true };
    expect(valueOf(after, 'notification.feed', 'all')).toEqual({ rows: [keptRow], hasMore: false });
    expect(rowsOf(after, 'dashboard.notifications')).toEqual([keptRow]);
    expect(valueOf(after, 'dashboard.unread')).toBe(0);
  });
});

describe('summary projection', () => {
  test('counts what the home cards show', () => {
    const writes = projectSummary({
      cameras: [
        { isOnline: true, isEnabled: true },
        { isOnline: true, isEnabled: false },
      ],
      projects: [
        { status: 'active' },
        { status: 'planned' },
        { status: 'paused' },
        { status: 'done' },
        { status: 'canceled' },
      ],
      openTasks: 1,
    });
    expect(valueOf(writes, 'dashboard.summary')).toEqual({
      camerasTotal: 2,
      camerasOnline: 1,
      projectsActive: 1,
      projectsTotal: 5,
      tasksOpen: 1,
    });
  });
});

describe('calendar projections', () => {
  const sources = {
    events: [
      {
        id: 'e1',
        ownerId: '1',
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
    tasks: [
      { id: 't1', title: 'Fix', dueAt: new Date(2026, 9, 15), status: 'doing', projectId: 'p1' },
    ],
  };

  test('the active month and its neighbours are written as three scopes', () => {
    const writes = projectCalendar(sources, now);
    expect(writes.map((write) => write.scope)).toEqual([
      'month.2026-09',
      'month.2026-10',
      'month.2026-11',
    ]);
    expect(
      (rowsOf(writes, 'calendar.entries', 'month.2026-11') as { id: string }[]).map(
        (entry) => entry.id
      )
    ).toEqual(['event:e1']);
    expect(
      (rowsOf(writes, 'calendar.entries', 'month.2026-10') as { id: string }[]).map(
        (entry) => entry.id
      )
    ).toEqual(['task:t1']);
    expect(calendarMonthScope(now)).toBe('month.2026-10');
  });

  test("today's agenda keeps only today", () => {
    const entries = rowsOf(projectAgenda(sources, ctx), 'dashboard.agenda', 'today') as {
      id: string;
      status: string;
    }[];
    expect(entries.map((entry) => [entry.id, entry.status])).toEqual([['task:t1', 'active']]);
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

  test('a task keeps its own status whatever the time', () => {
    const task = entry({ id: 'task:1', source: 'task', isAllDay: true, endsAt: null });
    expect(calendarEntryState(task, at(0, 0, 20))).toBe('todo');
    expect(calendarEntryState({ ...task, status: 'active' }, at(0, 0, 10))).toBe('doing');
    expect(calendarEntryState({ ...task, status: 'complete' }, at(0, 0, 20))).toBe('done');
  });

  test('the projected event turns ongoing as time passes, with no new projection', () => {
    const [event] = rowsOf(
      projectAgenda(
        {
          events: [
            {
              id: 'e2',
              ownerId: '1',
              title: 'Pay',
              startsAt: new Date(2026, 9, 15, 18),
              endsAt: null,
              isAllDay: false,
              color: '',
              location: '',
              description: '',
              projectId: null,
            },
          ],
          tasks: [],
        },
        ctx
      ),
      'dashboard.agenda',
      'today'
    ) as CalendarEntry[];
    if (!event) throw new Error('no event');
    expect(calendarEntryState(event, at(17))).toBe('upcoming');
    expect(calendarEntryState(event, at(18, 1))).toBe('ongoing');
  });
});
