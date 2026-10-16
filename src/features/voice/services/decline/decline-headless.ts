import '@/core/services/session.service';
import { pushService } from '@/core/services/push';
import { traceEvent } from '@/core/services/native-trace';
import { DECLINE_TASK_NAME, runDeclineTask } from '@/features/voice/model/decline-task';
import { requestCallDecline } from '@/features/voice/services/rtc/rtc-token';
import { withTimeout } from '@/features/voice/model/with-timeout';

export { DECLINE_TASK_NAME };

export async function declineHeadlessTask(data?: { callId?: unknown }): Promise<void> {
  await runDeclineTask(data?.callId, {
    post: (callId) => requestCallDecline({ callId }),
    ack: (callId) => pushService.ackDecline(callId),
    trace: (outcome, reason) => traceEvent('decline', outcome, reason),
    withTimeout,
  });
}
