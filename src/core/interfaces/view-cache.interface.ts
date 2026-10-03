import type {
  CameraDriverKind,
  CameraRecordMode,
  CalendarEntry,
  DashboardProjectCard,
  DashboardSummary,
  EventSeverity,
  IconName,
  UserRole,
  ZonePoint,
  ZoneType,
} from '@/core/types';

export interface IViewCacheWriteOptions {
  limit?: number;
  replaceScoped?: boolean;
}

export interface ICameraListCacheRow {
  id: string;
  icon: IconName;
  name: string;
  ip: string;
  model: string;
  isOnline: boolean;
  isEnabled: boolean;
  zones: number;
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
  icon: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  cloudUsername: string;
  manufacturer: string;
  model: string;
  recordMode: CameraRecordMode;
  retentionDays: number | null;
  isOnline: boolean;
  isEnabled: boolean;
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

export interface ICameraDetailCache {
  camera: ICameraCacheRow;
  zones: readonly IZoneCacheRow[];
}

export interface IDashboardCameraCacheRow {
  id: string;
  name: string;
  model: string;
  ip: string;
  isOnline: boolean;
  isEnabled: boolean;
  resolution?: string;
  recordMode?: string;
}

export interface IProjectCacheRow {
  id: string;
  name: string;
  description: string;
  status: string;
}

export interface IProjectTaskCacheRow {
  id: string;
  projectId: string;
  title: string;
  status: string;
  priority: string;
  dueAt: number | null;
}

export interface IProjectsCacheData {
  projects: readonly IProjectCacheRow[];
  tasks: readonly IProjectTaskCacheRow[];
  displayProjects: readonly IProjectCacheRow[];
  displayTasks: readonly IProjectTaskCacheRow[];
  activeId: string;
  progress: { done: number; total: number };
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
  title: string;
  body: string;
  isRead: boolean;
}

export interface IDashboardCacheData {
  cameraTiles: readonly IDashboardCameraCacheRow[];
  projects: readonly DashboardProjectCard[];
  today: readonly CalendarEntry[];
  notifications: readonly INotificationPreviewCacheRow[];
  unreadNotifications: number;
  summary: DashboardSummary;
  activityLevels: readonly (readonly number[])[];
}

export interface ICalendarEventCacheSource {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  isAllDay: boolean;
  color: string;
  location: string;
  description: string;
  projectId: string | null;
}

export interface ICalendarEventFormRecord {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  isAllDay: boolean;
  location: string;
  description: string;
}

export interface IReminderCacheSource {
  id: string;
  title: string;
  scheduledAt: Date;
  isCompleted: boolean;
}

export interface IProjectTaskCalendarCacheSource {
  id: string;
  title: string;
  dueAt: Date | null;
  status: string;
  projectId: string;
}
