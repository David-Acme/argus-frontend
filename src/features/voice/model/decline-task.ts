export const DECLINE_TASK_NAME = 'ArgusDecline';

export const DECLINE_TASK_TIMEOUT_MS = 10_000;

export type DeclineTaskOutcome = 'sent' | 'failed';

export type DeclineTaskDeps = {
  post: (callId: string) => Promise<unknown>;
  ack: (callId: string) => void;
  trace: (outcome: 'sent' | 'failed', reason: string) => void;
  withTimeout: (pending: Promise<unknown>, ms: number) => Promise<unknown>;
};

export function declineReasonOf(error: unknown): string {
  return error instanceof Error && error.message.includes('TIMEOUT') ? 'timeout' : 'request-failed';
}

export async function runDeclineTask(callId: unknown, deps: DeclineTaskDeps): Promise<DeclineTaskOutcome> {
  if (typeof callId !== 'string' || callId.length === 0) {
    deps.trace('failed', 'no-call-id');
    return 'failed';
  }
  try {
    await deps.withTimeout(deps.post(callId), DECLINE_TASK_TIMEOUT_MS);
  } catch (error) {
    deps.trace('failed', declineReasonOf(error));
    return 'failed';
  }
  deps.ack(callId);
  deps.trace('sent', 'headless');
  return 'sent';
}
