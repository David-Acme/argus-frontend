import type { Collection, Database } from '@nozbe/watermelondb';
import type { ModelMap, TableName } from '@/core/types';
import { database as databaseImpl, flushDatabase as flushDatabaseImpl } from './database';

export const database: Database = databaseImpl;

export const flushDatabase: () => Promise<void> = flushDatabaseImpl;

export const collection = <K extends TableName>(name: K): Collection<ModelMap[K]> =>
  database.get(name) as unknown as Collection<ModelMap[K]>;

export {
  CalendarEventModel,
  CalendarEventShareModel,
  CameraModel,
  ConversationMessageModel,
  NotificationModel,
  PersonModel,
  ProjectMemberModel,
  ProjectModel,
  ProjectTaskModel,
  ReminderModel,
  UserModel,
  UserInvitationModel,
  ZoneModel,
} from './tables';

export { migrations } from './migrations';
export { modelClasses, schema } from './schema';
