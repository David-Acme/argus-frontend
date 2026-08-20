import { CAMERA_SCHEMA, CameraModel } from './camera.table';
import { CAMERA_STREAM_SCHEMA, CameraStreamModel } from './camera-stream.table';
import { NOTIFICATION_SCHEMA, NotificationModel } from './notification.table';
import { REMINDER_DETAIL_SCHEMA, ReminderDetailModel } from './reminder-detail.table';
import { REMINDER_SCHEMA, ReminderModel } from './reminder.table';
import { USER_SCHEMA, UserModel } from './user.table';
import { ZONE_SCHEMA, ZoneModel } from './zone.table';

/** Single registry: `appSchema` and `modelClasses` are both derived from here. */
const TABLES = [
  { schema: USER_SCHEMA, model: UserModel },
  { schema: CAMERA_SCHEMA, model: CameraModel },
  { schema: CAMERA_STREAM_SCHEMA, model: CameraStreamModel },
  { schema: ZONE_SCHEMA, model: ZoneModel },
  { schema: REMINDER_SCHEMA, model: ReminderModel },
  { schema: REMINDER_DETAIL_SCHEMA, model: ReminderDetailModel },
  { schema: NOTIFICATION_SCHEMA, model: NotificationModel },
] as const;

export const TABLE_SCHEMAS = TABLES.map((table) => table.schema);

export const MODEL_CLASSES = TABLES.map((table) => table.model);

export {
  CameraModel,
  CameraStreamModel,
  NotificationModel,
  ReminderDetailModel,
  ReminderModel,
  UserModel,
  ZoneModel,
};
