import type { Collection, Database } from '@nozbe/watermelondb';
import type { ModelMap, TableName } from '@/core/types';
import { database as databaseImpl } from './database';

export const database: Database = databaseImpl;

export const collection = <K extends TableName>(name: K): Collection<ModelMap[K]> =>
  database.get(name) as unknown as Collection<ModelMap[K]>;

export {
  CalendarEventModel,
  CalendarEventShareModel,
  CameraModel,
  CameraStreamModel,
  EventModel,
  NotificationModel,
  PersonModel,
  ProjectMemberModel,
  ProjectModel,
  ProjectTaskModel,
  ReminderDetailModel,
  ReminderModel,
  UserModel,
  UserInvitationModel,
  ZoneModel,
} from './tables';

export { migrations } from './migrations';
export { modelClasses, schema } from './schema';
