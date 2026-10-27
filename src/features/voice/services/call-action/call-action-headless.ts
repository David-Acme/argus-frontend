import { sessionService } from '@/core/services/session.service';
import { pushService } from '@/core/services/push';
import { traceEvent } from '@/core/services/native-trace';
import { CALL_ACTION_TASK_TIMEOUT_MS } from '@/features/voice/constants/call.constant';
import { runCallActionTask } from '@/features/voice/model/call-action';
import type { CallActionRequest } from '@/features/voice/model/call-action';
import { withTimeout } from '@/features/voice/model/with-timeout';
import { reminderCallService } from '@/features/voice/services/call-action/call-action.service';

async function post(request: CallActionRequest): Promise<number> {
  await sessionService.initialize();
  return reminderCallService.act(request);
}

export async function callActionHeadlessTask(data?: unknown): Promise<void> {
  await runCallActionTask(data, {
    post,
    report: (callId, action, status) => pushService.reportCallAction(callId, action, status),
    trace: (outcome, reason) => traceEvent('call-action', outcome, reason),
    withTimeout,
    timeoutMs: CALL_ACTION_TASK_TIMEOUT_MS,
  });
}
