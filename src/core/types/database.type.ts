import type {
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
} from '@/core/database/tables';

export type UserRole = 'owner' | 'resident' | 'guard' | 'guest';

export type UserLang = 'es' | 'en';

export type PersonStatus = 'candidate' | 'known';

export type CameraRecordMode = 'off' | 'motion' | 'events' | 'continuous';

export const CAMERA_PRIVACY_STATES = ['on', 'off', 'unknown'] as const;

export type CameraPrivacyState = (typeof CAMERA_PRIVACY_STATES)[number];

export type CameraDriverKind = 'tapo' | 'onvif' | 'rtsp';

export type ZoneType = 'monitor' | 'alert' | 'exclude' | 'privacy';

export type DayNightMode = 'auto' | 'day' | 'night';

export type EventSeverity = 'info' | 'warning' | 'critical';

export type ShareAccess = 'view' | 'edit';

export type ProjectStatus = 'planned' | 'active' | 'paused' | 'done' | 'canceled';

export type ProjectTaskStatus = 'backlog' | 'todo' | 'doing' | 'done' | 'canceled';


export type ProjectTaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export type ZonePoint = { x: number; y: number };

export type CameraCapabilities = string[];

export type CameraConfig = Record<string, unknown>;

export type NotificationData = Record<string, unknown>;


export type ModelMap = {
  user: UserModel;
  user_invitation: UserInvitationModel;
  camera: CameraModel;
  zone: ZoneModel;
  reminder: ReminderModel;
  calendar_event: CalendarEventModel;
  calendar_event_share: CalendarEventShareModel;
  project: ProjectModel;
  project_member: ProjectMemberModel;
  project_task: ProjectTaskModel;
  person: PersonModel;
  notification: NotificationModel;
  conversation_message: ConversationMessageModel;
};

export type TableName = keyof ModelMap;

export type ModelOf<K extends TableName> = ModelMap[K];
