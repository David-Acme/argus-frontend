import type {
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
} from '@/core/database/tables';

export type UserRole = 'owner' | 'resident' | 'guard' | 'guest';

export type UserLang = 'es' | 'en';

export type PersonStatus = 'candidate' | 'known';

export type CameraRecordMode = 'events' | 'continuous';

export type CameraDriverKind = 'tapo' | 'onvif' | 'rtsp';

export type ZoneType = 'monitor' | 'alert' | 'exclude';

export type DayNightMode = 'auto' | 'day' | 'night';

export type ReminderDetailStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

export type EventSeverity = 'info' | 'warning' | 'critical';

export type ProjectStatus = 'planned' | 'active' | 'paused' | 'done' | 'canceled';

export type ProjectTaskStatus = 'backlog' | 'todo' | 'doing' | 'done' | 'canceled';


export type ProjectTaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export type ZonePoint = { x: number; y: number };

export type CameraCapabilities = string[];

export type CameraConfig = Record<string, unknown>;

export type NotificationData = Record<string, unknown>;

export type EventDetails = Record<string, unknown>;

export type ModelMap = {
  user: UserModel;
  user_invitation: UserInvitationModel;
  camera: CameraModel;
  camera_stream: CameraStreamModel;
  zone: ZoneModel;
  reminder: ReminderModel;
  reminder_detail: ReminderDetailModel;
  calendar_event: CalendarEventModel;
  calendar_event_share: CalendarEventShareModel;
  project: ProjectModel;
  project_member: ProjectMemberModel;
  project_task: ProjectTaskModel;
  event: EventModel;
  person: PersonModel;
  notification: NotificationModel;
};

export type TableName = keyof ModelMap;

export type ModelOf<K extends TableName> = ModelMap[K];
