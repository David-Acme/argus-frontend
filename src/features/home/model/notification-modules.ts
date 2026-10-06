import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { MODULE_IDS } from '@/shared/constants';

type NotificationRow = Pick<INotificationPreviewCacheRow, 'data'>;

export const NOTIFICATION_KIND_MODULES: ReadonlyMap<string, string> = new Map([
  ['guard_episode', MODULE_IDS.surveillance],
  ['guard_tamper', MODULE_IDS.surveillance],
  ['guard_digest', MODULE_IDS.surveillance],
  ['guard_arrival', MODULE_IDS.surveillance],
  ['camera_fallback', MODULE_IDS.surveillance],
  ['camera_fallback_digest', MODULE_IDS.surveillance],
  ['agenda_event', MODULE_IDS.productivity],
]);

export function moduleOfNotification(row: NotificationRow): string {
  const kind = typeof row.data.kind === 'string' ? row.data.kind : '';
  return NOTIFICATION_KIND_MODULES.get(kind) ?? MODULE_IDS.core;
}

export const notificationVisible = (row: NotificationRow, moduleActive: (moduleId: string) => boolean): boolean =>
  moduleActive(moduleOfNotification(row));
