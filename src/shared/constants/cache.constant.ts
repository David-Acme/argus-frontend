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
} as const;

export const VIEW_CACHE_KEYS = {
  dashboardAgenda: 'dashboard.agenda',
  dashboardNotifications: 'dashboard.notifications',
  dashboardSummary: 'dashboard.summary',
  dashboardProjects: 'dashboard.projects',
  dashboardActivity: 'dashboard.activity',
  dashboardUnread: 'dashboard.unread',
  notificationFeed: 'notification.feed',
  conversationList: 'conversation.list',
  conversationThread: 'conversation.thread',
  conversationUnread: 'conversation.unread',
  cameraList: 'camera.list',
  cameraEvents: 'camera.events',
  calendarEntries: 'calendar.entries',
  calendarAgenda: 'calendar.agenda',
  eventList: 'event.list',
  reminderList: 'reminder.list',
  projectList: 'project.list',
  projectTasks: 'project.tasks',
  taskList: 'task.list',
  projectMembers: 'project.members',
  calendarEventShares: 'calendar.event.shares',
  peopleUsers: 'people.users',
  peopleInvitations: 'people.invitations',
  settingsOverview: 'settings.overview',
  settingsProfiles: 'settings.profiles',
  cameraDevice: 'camera.device',
  cameraCapabilities: 'camera.capabilities',
  cameraCatalog: 'camera.catalog',
  cameraOverview: 'camera.overview',
  cameraClips: 'camera.clips',
  cameraRecording: 'camera.recording',
  cameraPresets: 'camera.presets',
  cameraAim: 'camera.aim',
  cameraPatrol: 'camera.patrol',
  tamperEvidence: 'camera.tamper-evidence',
  guardMaintenance: 'guard.maintenance',
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
  gettingStartedSignals: 'modules.getting-started.signals',
  appContext: 'app.context',
  syncReady: 'sync.ready',
  activityFeed: 'activity.feed',
  watchConversations: 'voice.watch',
  proximityMe: 'guard.proximity.me',
  proximityReceivers: 'guard.proximity.receivers',
  proximitySensors: 'guard.proximity.sensors',
  proximityPeople: 'guard.proximity.people',
} as const;

export const ACCESS_CACHE_KEYS = [VIEW_CACHE_KEYS.appContext, VIEW_CACHE_KEYS.moduleCatalog] as const;

export const CONTEXT_RESYNC_KEPT_KEYS = [...ACCESS_CACHE_KEYS, VIEW_CACHE_KEYS.privacyMe] as const;

export const buildViewCacheStorageKey = (
  userId: string,
  key: string,
  scope?: string,
): string => `${VIEW_CACHE_PREFIX}${userId}.${key}${scope ? `.${scope}` : ''}`;
