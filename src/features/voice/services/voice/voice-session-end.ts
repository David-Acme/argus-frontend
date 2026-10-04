import { sessionService } from '@/core/services/session.service';
import { endNoticeOf } from '@/core/services/sync/session-end-notice';
import type { SessionRevokeCause } from '@/core/types';

export function endRevokedSession(cause: SessionRevokeCause | null): void {
  void sessionService.endSession(endNoticeOf(cause));
}
