import type { NotificationThreadTarget } from '@/core/types';
import { readBatches } from './notification-read-batches';

export type NotificationReadCall = {
  path: string;
  body: Record<string, unknown>;
};

export function notificationReadCalls({
  threadKey,
  ids,
}: Pick<NotificationThreadTarget, 'threadKey' | 'ids'>): NotificationReadCall[] {
  if (threadKey !== null) {
    return [{ path: `/notification/thread/${encodeURIComponent(threadKey)}/read`, body: {} }];
  }
  return readBatches(ids).map((batch) => ({ path: '/notification/read', body: { ids: batch } }));
}
