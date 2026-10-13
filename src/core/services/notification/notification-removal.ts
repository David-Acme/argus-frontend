import type { IServiceResponse } from '@/core/interfaces';
import type { NotificationRemoval } from '@/core/types';

export type RemovalAttempt = {
  id: string;
  response: IServiceResponse<unknown>;
};

const alreadyGone = (response: IServiceResponse<unknown>): boolean =>
  response.status === 404 && response.errors?.code === 'NOT_FOUND';

export function removalResponse(
  attempts: readonly RemovalAttempt[]
): IServiceResponse<NotificationRemoval> {
  const refusals = attempts.filter(({ response }) => !response.ok && !alreadyGone(response));
  const [first] = refusals;
  if (first && refusals.length === attempts.length) {
    return { status: first.response.status, ok: false, info: null, errors: first.response.errors };
  }
  return { status: 200, ok: true, info: { refused: refusals.map(({ id }) => id) }, errors: null };
}
