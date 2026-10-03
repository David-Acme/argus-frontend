export const VIEW_CACHE_PREFIX = 'view.cache.v2.';

export const VIEW_CACHE_PAGE_SIZE = 40;

export const VIEW_CACHE_LIST_LIMIT = 1000;

export const VIEW_CACHE_CALENDAR_MONTH_DAYS = 42;

export const VIEW_CACHE_CALENDAR_ENTRY_LIMIT = 400;

export const EMPTY_DASHBOARD_SUMMARY = {
  camerasTotal: 0,
  camerasOnline: 0,
  remindersPending: 0,
  projectsActive: 0,
  tasksOpen: 0,
  eventsCurrent: 0,
  eventsPrevious: 0,
} as const;

export const VIEW_CACHE_KEYS = {
  dashboardAgenda: 'dashboard.agenda',
  dashboardNotifications: 'dashboard.notifications',
  dashboardSummary: 'dashboard.summary',
  dashboardProjects: 'dashboard.projects',
  dashboardActivity: 'dashboard.activity',
  dashboardUnread: 'dashboard.unread',
  cameraList: 'camera.list',
  cameraEvents: 'camera.events',
  calendarEntries: 'calendar.entries',
  projectList: 'project.list',
  projectTasks: 'project.tasks',
  peopleUsers: 'people.users',
  peopleInvitations: 'people.invitations',
  settingsOverview: 'settings.overview',
  cameraDevice: 'camera.device',
  cameraCapabilities: 'camera.capabilities',
  guardMode: 'guard.mode',
  guardGuests: 'guard.guests',
  guardIncidents: 'guard.incidents',
  guardDecisions: 'guard.decisions',
} as const;

export const buildViewCacheStorageKey = (
  userId: string,
  key: string,
  scope?: string,
): string => `${VIEW_CACHE_PREFIX}${userId}.${key}${scope ? `.${scope}` : ''}`;
