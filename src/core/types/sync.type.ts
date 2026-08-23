export const SYNC_TABLE_KEYS = [
  'user',
  'user_invitation',
  'camera',
  'camera_stream',
  'zone',
  'reminder',
  'reminder_detail',
  'calendar_event',
  'calendar_event_share',
  'project',
  'project_member',
  'project_task',
  'event',
  'person',
  'notification',
] as const;

export type SyncTableKey = (typeof SYNC_TABLE_KEYS)[number];

/** Cursors persisted in storageService (`app.sync.<userId>`), in seconds; absent means a first full sync. */
export type SyncCursors = {
  [key in SyncTableKey]?: {
    createdStart?: number;
    createdId?: number | string;
    deletedStart?: number;
    deletedId?: number | string;
  };
};
