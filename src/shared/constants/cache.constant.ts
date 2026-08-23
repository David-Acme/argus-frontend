/** MMKV namespace for the view snapshots that make a screen paint instantly. */
export const VIEW_CACHE_PREFIX = 'view.cache.';

/** Rows kept per snapshot: enough to fill a screen, cheap to write on change. */
export const VIEW_CACHE_LIMIT = 60;

export const VIEW_CACHE_KEYS = {
  dashboardCameras: 'dashboard.cameras',
  dashboardAgenda: 'dashboard.agenda',
  dashboardNotifications: 'dashboard.notifications',
  dashboardSummary: 'dashboard.summary',
  dashboardProjects: 'dashboard.projects',
  dashboardActivity: 'dashboard.activity',
  dashboardUnread: 'dashboard.unread',
  cameraList: 'camera.list',
  calendarEntries: 'calendar.entries',
  projectList: 'project.list',
  projectTasks: 'project.tasks',
  peopleUsers: 'people.users',
  peopleInvitations: 'people.invitations',
} as const;

export type ViewCacheKey = (typeof VIEW_CACHE_KEYS)[keyof typeof VIEW_CACHE_KEYS];
