export const VIEW_CACHE_PREFIX = 'view.cache.v2.';

export const VIEW_CACHE_PAGE_SIZE = 40;

export const VIEW_CACHE_LIST_LIMIT = 1000;

export const VIEW_CACHE_CALENDAR_MONTH_DAYS = 42;

export const VIEW_CACHE_CALENDAR_LEAD_DAYS = 6;

export const VIEW_CACHE_CALENDAR_ENTRY_LIMIT = 400;

export const NOTIFICATION_FEED_PAGE_SIZE = 40;
export const NOTIFICATION_READ_BATCH_SIZE = 500;

export const NOTIFICATION_FEED_SCOPE = 'all';

export const AGENDA_FEED_INITIAL_WEEKS = 5;

export const AGENDA_FEED_STEP_WEEKS = 4;

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
  notificationFeed: 'notification.feed',
  cameraList: 'camera.list',
  cameraEvents: 'camera.events',
  calendarEntries: 'calendar.entries',
  calendarAgenda: 'calendar.agenda',
  projectList: 'project.list',
  projectTasks: 'project.tasks',
  peopleUsers: 'people.users',
  peopleInvitations: 'people.invitations',
  settingsOverview: 'settings.overview',
  settingsProfiles: 'settings.profiles',
  cameraDevice: 'camera.device',
  cameraCapabilities: 'camera.capabilities',
  cameraCatalog: 'camera.catalog',
  cameraOverview: 'camera.overview',
  cameraPresets: 'camera.presets',
  guardEnvironments: 'guard.environments',
  guardResponse: 'guard.response',
  guardGuests: 'guard.guests',
  guardCameras: 'guard.cameras',
  guardEpisodes: 'guard.episode-feed',
  guardEpisode: 'guard.episode',
  voiceprintUsers: 'voiceprint.users',
  presence: 'guard.presence',
  authSessions: 'auth.sessions',
  authUserSessions: 'auth.user-sessions',
  callPreferences: 'voice.call-preferences',
  privacyMe: 'privacy.me',
  privacyDirectory: 'privacy.users',
  safetyStatus: 'safety.status',
  visitors: 'visitor.feed',
  visitorDetail: 'visitor.detail',
  visitorSettings: 'visitor.settings',
  moduleCatalog: 'modules.catalog',
} as const;

export const buildViewCacheStorageKey = (
  userId: string,
  key: string,
  scope?: string,
): string => `${VIEW_CACHE_PREFIX}${userId}.${key}${scope ? `.${scope}` : ''}`;
