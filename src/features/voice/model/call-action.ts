import type { IServiceResponse } from '@/core/interfaces';

export type CallActionKind = 'snooze' | 'done';

export type CallActionRequest = {
  token: string;
  action: CallActionKind;
};

export type CallActionTaskInput = {
  callId: string;
  request: CallActionRequest;
};

export type CallActionTaskDeps = {
  post: (request: CallActionRequest) => Promise<number>;
  report: (callId: string, action: CallActionKind, status: number) => void;
  trace: (outcome: 'sent' | 'failed', reason: string) => void;
  withTimeout: <T>(pending: Promise<T>, ms: number) => Promise<T>;
  timeoutMs: number;
};

const TOKEN_SHAPE = /^[0-9a-f]{64}$/;

const actionOf = (value: unknown): CallActionKind | null =>
  value === 'snooze' || value === 'done' ? value : null;

export function callActionTaskInputOf(data: unknown): CallActionTaskInput | null {
  if (typeof data !== 'object' || data === null) return null;
  const { callId, token, action } = data as Record<string, unknown>;
  const kind = actionOf(action);
  if (typeof callId !== 'string' || callId.length === 0 || kind === null) return null;
  if (typeof token !== 'string' || !TOKEN_SHAPE.test(token)) return null;
  return { callId, request: { token, action: kind } };
}

export function callActionStatusOf(answer: IServiceResponse<unknown>): number {
  return Number.isInteger(answer.status) && answer.status > 0 ? answer.status : 0;
}

export async function runCallActionTask(data: unknown, deps: CallActionTaskDeps): Promise<number> {
  const input = callActionTaskInputOf(data);
  if (input === null) {
    deps.trace('failed', 'bad-input');
    return 0;
  }
  const status = await deps.withTimeout(deps.post(input.request), deps.timeoutMs).catch(() => 0);
  deps.report(input.callId, input.request.action, status);
  deps.trace(status >= 200 && status < 300 ? 'sent' : 'failed', `status-${status}`);
  return status;
}
