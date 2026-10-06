import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { MODULE_IDS } from '@/shared/constants';

type NotificationRow = Pick<INotificationPreviewCacheRow, 'type' | 'data'>;

const KIND_MODULES: Readonly<Record<string, string>> = {
  guard_episode: MODULE_IDS.surveillance,
  guard_tamper: MODULE_IDS.surveillance,
  guard_digest: MODULE_IDS.surveillance,
  guard_arrival: MODULE_IDS.surveillance,
  guard_response: MODULE_IDS.surveillance,
  guard_duress: MODULE_IDS.surveillance,
  camera_fallback: MODULE_IDS.surveillance,
  camera_fallback_digest: MODULE_IDS.surveillance,
  agenda_event: MODULE_IDS.productivity,
  agenda_reminder: MODULE_IDS.productivity,
};

const TYPE_MODULES: Readonly<Record<string, string>> = {
  camera: MODULE_IDS.surveillance,
};

export function moduleOfNotification(row: NotificationRow): string {
  const kind = typeof row.data.kind === 'string' ? row.data.kind : '';
  const named = KIND_MODULES[kind];
  if (named) return named;
  return kind ? MODULE_IDS.core : (TYPE_MODULES[row.type] ?? MODULE_IDS.core);
}

export const notificationVisible = (row: NotificationRow, moduleActive: (moduleId: string) => boolean): boolean =>
  moduleActive(moduleOfNotification(row));
