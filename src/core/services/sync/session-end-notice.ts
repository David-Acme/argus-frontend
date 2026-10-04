import type { SessionEndNotice, SessionRevokeCause } from '@/core/types';

export function endNoticeOf(cause: SessionRevokeCause | null): SessionEndNotice {
  if (cause === 'accountDisabled') return 'account-disabled';
  if (cause === 'revokedByOwner') return 'closed-by-owner';
  return 'closed-here';
}
