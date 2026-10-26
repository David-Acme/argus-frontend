import type {
  CameraAimConfig,
  CameraCapabilities,
  CameraDriverKind,
  CameraPrivacyState,
  CameraRecordMode,
  EventSeverity,
  IconName,
  NotificationData,
  RecurrenceException,
  UserRole,
  ZonePoint,
  ZoneType,
} from '@/core/types';

export interface IViewCacheWriteOptions {
  limit?: number;
}

export interface ICameraEventCacheRow {
  id: string;
  summary: string;
  severity: EventSeverity;
  occurredAt: number;
}

export interface ICameraCacheRow {
  id: string;
  driver: CameraDriverKind;
  icon: IconName;
  name: string;
  ip: string;
  port: number;
  username: string;
  cloudUsername: string;
  manufacturer: string;
  model: string;
  modelLabel: string;
  recordMode: CameraRecordMode;
  privacyState: CameraPrivacyState;
  privacyObeyed: boolean;
  watchman: boolean;
  noAudio: boolean;
  retentionDays: number | null;
  retentionIncident: boolean;
  isOnline: boolean;
  isEnabled: boolean;
  streamPath: string;
  subStreamPath: string;
  catalogId: string;
  capabilities: CameraCapabilities;
  aim?: CameraAimConfig;
  zones: readonly IZoneCacheRow[];
}

export interface IZoneCacheRow {
  id: string;
  cameraId: string;
  name: string;
  points: ZonePoint[];
  zoneType: ZoneType;
  color: string;
  isEnabled: boolean;
}

export interface IProjectCacheRow {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  status: string;
}

export interface IProjectMemberCacheRow {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  access: string;
}

export interface IProjectTaskCacheRow {
  id: string;
  projectId: string;
  title: string;
  status: string;
  priority: string;
  dueAt: number | null;
}

export interface IPeopleDirectoryCacheRow {
  id: string;
  name: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface IPeopleDirectoryFilter {
  query: string;
  role: UserRole | 'all';
}

export interface INotificationPreviewCacheRow {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data: NotificationData;
  createdAt: number;
}

export interface ICalendarEventCacheSource {
  id: string;
  ownerId: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  isAllDay: boolean;
  color: string;
  location: string;
  description: string;
  projectId: string | null;
  recurrenceRule?: string | null;
  recurrenceExceptions?: readonly RecurrenceException[];
}

export interface IEventListCacheRow {
  id: string;
  title: string;
  startsAt: number;
  isAllDay: boolean;
  recurrenceRule: string | null;
}

export interface ICalendarEventShareCacheRow {
  id: string;
  calendarEventId: string;
  userId: string;
  name: string;
  access: string;
}

export interface ICalendarEventFormRecord {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  isAllDay: boolean;
  location: string;
  description: string;
  recurrenceRule?: string | null;
}

export interface IReminderCacheSource {
  id: string;
  title: string;
  description: string;
  scheduledAt: Date;
  isCompleted: boolean;
  completedAt: Date | null;
  recurrenceRule: string | null;
  recurrenceExceptions?: readonly RecurrenceException[];
}

export interface IReminderCacheRow {
  id: string;
  title: string;
  description: string;
  scheduledAt: number;
  isCompleted: boolean;
  completedAt: number | null;
  recurrenceRule: string | null;
  recurrenceExceptions?: readonly RecurrenceException[];
}

export interface IReminderCreate {
  title: string;
  description: string;
  scheduledAt: number;
  recurrenceRule?: string;
}

export interface IReminderUpdate {
  title?: string;
  description?: string | null;
  scheduledAt?: number;
  isCompleted?: boolean;
  recurrenceRule?: string | null;
}

export interface IOccurrenceChange {
  occurrence: number;
  cancelled?: boolean;
  startsAt?: number;
  endsAt?: number;
  title?: string;
  location?: string;
}

export type IReminderSnooze = { minutes: number; tomorrow?: never } | { tomorrow: true; minutes?: never };

export interface IProjectTaskCalendarCacheSource {
  id: string;
  title: string;
  dueAt: Date | null;
  status: string;
  projectId: string;
}
