import { describe, expect, test } from 'bun:test';
import { declineReasonOf, runDeclineTask, type DeclineTaskDeps } from '@/features/voice/model/decline-task';

function harness(overrides: Partial<DeclineTaskDeps> = {}) {
  const acked: string[] = [];
  const traces: [string, string][] = [];
  const posted: string[] = [];
  const deps: DeclineTaskDeps = {
    post: async (callId) => {
      posted.push(callId);
      return { declined: true };
    },
    ack: (callId) => acked.push(callId),
    trace: (outcome, reason) => traces.push([outcome, reason]),
    withTimeout: (pending) => pending,
    ...overrides,
  };
  return { deps, acked, traces, posted };
}

describe('the headless decline task posts the decline and acknowledges it only after the server answers', () => {
  test('a decline that the server accepts is sent, acknowledged and traced as sent', async () => {
    const { deps, acked, traces, posted } = harness();
    expect(await runDeclineTask('call-155', deps)).toBe('sent');
    expect(posted).toEqual(['call-155']);
    expect(acked).toEqual(['call-155']);
    expect(traces).toEqual([['sent', 'headless']]);
  });

  test('a request that fails is traced as failed and keeps the decline pending for the next start', async () => {
    const { deps, acked, traces } = harness({
      post: async () => {
        throw new Error('network down');
      },
    });
    expect(await runDeclineTask('call-155', deps)).toBe('failed');
    expect(acked).toEqual([]);
    expect(traces).toEqual([['failed', 'request-failed']]);
  });

  test('a request that outlives the deadline is traced as failed with reason timeout', async () => {
    const { deps, acked, traces } = harness({
      withTimeout: async () => {
        throw new Error('RTC_TOKEN_TIMEOUT');
      },
    });
    expect(await runDeclineTask('call-155', deps)).toBe('failed');
    expect(acked).toEqual([]);
    expect(traces).toEqual([['failed', 'timeout']]);
  });

  test('a task without a call id fails without posting anything', async () => {
    const { deps, acked, traces, posted } = harness();
    expect(await runDeclineTask(undefined, deps)).toBe('failed');
    expect(await runDeclineTask('', deps)).toBe('failed');
    expect(posted).toEqual([]);
    expect(acked).toEqual([]);
    expect(traces).toEqual([
      ['failed', 'no-call-id'],
      ['failed', 'no-call-id'],
    ]);
  });

  test('a late decline the server already recorded is posted again and acknowledged, so the server stays idempotent', async () => {
    const { deps, acked, posted } = harness();
    await runDeclineTask('call-155', deps);
    await runDeclineTask('call-155', deps);
    expect(posted).toEqual(['call-155', 'call-155']);
    expect(acked).toEqual(['call-155', 'call-155']);
  });

  test('the failure reason names a timeout only for the deadline error', () => {
    expect(declineReasonOf(new Error('RTC_TOKEN_TIMEOUT'))).toBe('timeout');
    expect(declineReasonOf(new Error('boom'))).toBe('request-failed');
    expect(declineReasonOf('not an error')).toBe('request-failed');
  });
});
