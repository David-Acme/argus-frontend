import type { IServiceResponse } from '@/core/interfaces';
import type { NotificationData, NotificationThreadTarget } from '@/core/types';

type ThreadRow = { id: string; data: NotificationData };

const alreadyGone = (response: IServiceResponse<unknown>): boolean =>
  response.status === 404 && response.errors?.code === 'NOT_FOUND';

export const removalSettled = (response: IServiceResponse<unknown>): boolean =>
  response.ok || alreadyGone(response);

export function notificationThreadKey(data: NotificationData | null | undefined): string | null {
  const value = data?.threadKey;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function threadRemovalPaths({ threadKey, ids }: Pick<NotificationThreadTarget, 'threadKey' | 'ids'>): string[] {
  return threadKey === null
    ? ids.map((id) => `/notification/${id}`)
    : [`/notification/thread/${encodeURIComponent(threadKey)}`];
}

export function threadRemovalResult(responses: readonly IServiceResponse<unknown>[]): IServiceResponse<null> {
  const refusal = responses.find((response) => !removalSettled(response));
  return refusal
    ? { status: refusal.status, ok: false, info: null, errors: refusal.errors }
    : { status: 200, ok: true, info: null, errors: null };
}

export const belongsToThread = (
  row: ThreadRow,
  { threadKey, ids }: Pick<NotificationThreadTarget, 'threadKey' | 'ids'>
): boolean => (threadKey === null ? ids.includes(row.id) : notificationThreadKey(row.data) === threadKey);
