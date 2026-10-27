import {
  CALENDAR_EVENT_SHARE_SCHEMA,
  CalendarEventShareModel,
} from './calendar-event-share.table';
import { CALENDAR_EVENT_SCHEMA, CalendarEventModel } from './calendar-event.table';
import { CAMERA_SCHEMA, CameraModel } from './camera.table';
import {
  CONVERSATION_MESSAGE_SCHEMA,
  CONVERSATION_THREAD_INDEX_SQL,
  ConversationMessageModel,
} from './conversation-message.table';
import {
  NOTIFICATION_FEED_INDEX_SQL,
  NOTIFICATION_SCHEMA,
  NotificationModel,
} from './notification.table';
import { PERSON_SCHEMA, PersonModel } from './person.table';
import { PROJECT_MEMBER_SCHEMA, ProjectMemberModel } from './project-member.table';
import { PROJECT_SCHEMA, ProjectModel } from './project.table';
import { PROJECT_TASK_SCHEMA, ProjectTaskModel } from './project-task.table';
import { USER_SCHEMA, UserModel } from './user.table';
import { USER_INVITATION_SCHEMA, UserInvitationModel } from './user-invitation.table';
import { ZONE_SCHEMA, ZoneModel } from './zone.table';

const TABLES = [
  { schema: USER_SCHEMA, model: UserModel },
  { schema: USER_INVITATION_SCHEMA, model: UserInvitationModel },
  { schema: CAMERA_SCHEMA, model: CameraModel },
  { schema: ZONE_SCHEMA, model: ZoneModel },
  { schema: CALENDAR_EVENT_SCHEMA, model: CalendarEventModel },
  { schema: CALENDAR_EVENT_SHARE_SCHEMA, model: CalendarEventShareModel },
  { schema: PROJECT_SCHEMA, model: ProjectModel },
  { schema: PROJECT_MEMBER_SCHEMA, model: ProjectMemberModel },
  { schema: PROJECT_TASK_SCHEMA, model: ProjectTaskModel },
  { schema: PERSON_SCHEMA, model: PersonModel },
  { schema: NOTIFICATION_SCHEMA, model: NotificationModel },
  { schema: CONVERSATION_MESSAGE_SCHEMA, model: ConversationMessageModel },
] as const;

export const TABLE_SCHEMAS = TABLES.map((table) => table.schema);

export const MODEL_CLASSES = TABLES.map((table) => table.model);

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
  UserModel,
  UserInvitationModel,
  ZoneModel,
};

export {
  CALENDAR_EVENT_SCHEMA,
  CALENDAR_EVENT_SHARE_SCHEMA,
  CONVERSATION_MESSAGE_SCHEMA,
  CONVERSATION_THREAD_INDEX_SQL,
  NOTIFICATION_FEED_INDEX_SQL,
  PERSON_SCHEMA,
  PROJECT_MEMBER_SCHEMA,
  PROJECT_SCHEMA,
  PROJECT_TASK_SCHEMA,
};
