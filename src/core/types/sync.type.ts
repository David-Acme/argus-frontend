export const SYNC_TABLE_KEYS = [
  'user',
  'camera',
  'camera_stream',
  'zone',
  'reminder',
  'reminder_detail',
  'notification',
] as const;

export type SyncTableKey = (typeof SYNC_TABLE_KEYS)[number];

/** Cursores persistidos en storageService (`app.sync.<userId>`); segundos; ausente = primer sync completo. */
export type SyncCursors = {
  [key in SyncTableKey]?: {
    createdStart?: number;
    createdId?: number | string;
    deletedStart?: number;
    deletedId?: number | string;
  };
};
