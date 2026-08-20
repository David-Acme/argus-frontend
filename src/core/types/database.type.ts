import type {
  CameraModel,
  CameraStreamModel,
  NotificationModel,
  ReminderDetailModel,
  ReminderModel,
  UserModel,
  ZoneModel,
} from '@/core/database/tables';

/** Mirrors the CHECK constraints and enums in the backend (`shared/enums.hxx`). */

export type UserRole = 'owner' | 'resident' | 'guard' | 'guest';

export type CameraRecordMode = 'events' | 'continuous';

export type ZoneType = 'monitor' | 'alert' | 'exclude';

export type ReminderDetailStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

/** Normalised [0..1] polygon vertex stored in `zone.points`. */
export type ZonePoint = { x: number; y: number };

/** Opaque server-side JSON: the backend never parses these. */
export type CameraCapabilities = string[];

export type CameraConfig = Record<string, unknown>;

export type NotificationData = Record<string, unknown>;

export type ModelMap = {
  user: UserModel;
  camera: CameraModel;
  camera_stream: CameraStreamModel;
  zone: ZoneModel;
  reminder: ReminderModel;
  reminder_detail: ReminderDetailModel;
  notification: NotificationModel;
};

export type TableName = keyof ModelMap;

export type ModelOf<K extends TableName> = ModelMap[K];
