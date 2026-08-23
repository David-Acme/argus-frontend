import type { Collection, Database } from '@nozbe/watermelondb';
import type { ModelMap, TableName } from '@/core/types';
import { database as databaseImpl } from './database';

export const database: Database = databaseImpl;

export const collection = <K extends TableName>(name: K): Collection<ModelMap[K]> =>
  // `Model`'s `this`-typed methods make it invariant, so TS cannot prove
  // `ModelMap[K] extends Model` for a generic `K`.
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
