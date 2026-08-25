import type { ISynchronizedDto } from '@/core/interfaces';

const FULL = {
  requiredCreate: true,
  findLastCreated: true,
  requiredDeleted: true,
  findLastDeleted: true,
} as const;

export const SYNC_FIRST_CONFIG: ISynchronizedDto = {
  user: FULL,
  user_invitation: FULL,
  camera: FULL,
  camera_stream: FULL,
  zone: FULL,
  reminder: FULL,
  reminder_detail: FULL,
  calendar_event: FULL,
  calendar_event_share: FULL,
  project: FULL,
  project_member: FULL,
  project_task: FULL,
  event: FULL,
  person: FULL,
  notification: { requiredCreate: true, findLastCreated: true },
};
