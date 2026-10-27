import { describe, expect, test } from 'bun:test';
import {
  callActionStatusOf,
  callActionTaskInputOf,
  runCallActionTask,
} from '@/features/voice/model/call-action';
import type { CallActionTaskDeps } from '@/features/voice/model/call-action';

const TOKEN = '0123456789abcdef'.repeat(4);

function harness(overrides: Partial<CallActionTaskDeps> = {}) {
  const posted: unknown[] = [];
  const reports: [string, string, number][] = [];
  const traces: [string, string][] = [];
  const deps: CallActionTaskDeps = {
    post: async (request) => {
      posted.push(request);
      return 200;
    },
    report: (callId, action, status) => reports.push([callId, action, status]),
    trace: (outcome, reason) => traces.push([outcome, reason]),
    withTimeout: (pending) => pending,
    timeoutMs: 10_000,
    ...overrides,
  };
  return { deps, posted, reports, traces };
}

describe('the lock-screen call action task', () => {
  test('reads the call, the token and one of the two actions, and nothing else', () => {
    expect(callActionTaskInputOf({ callId: 'call-9', token: TOKEN, action: 'snooze' })).toEqual({
      callId: 'call-9',
      request: { token: TOKEN, action: 'snooze' },
    });
    expect(callActionTaskInputOf({ callId: 'call-9', token: TOKEN, action: 'later' })).toBeNull();
    expect(
      callActionTaskInputOf({ callId: 'call-9', token: TOKEN.toUpperCase(), action: 'done' })
    ).toBeNull();
    expect(callActionTaskInputOf({ callId: 'call-9', token: 'abc', action: 'done' })).toBeNull();
    expect(callActionTaskInputOf({ callId: '', token: TOKEN, action: 'done' })).toBeNull();
    expect(callActionTaskInputOf(null)).toBeNull();
  });

  test('posts the action and reports the status to the native notification', async () => {
    const { deps, posted, reports, traces } = harness();
    expect(await runCallActionTask({ callId: 'call-9', token: TOKEN, action: 'done' }, deps)).toBe(
      200
    );
    expect(posted).toEqual([{ token: TOKEN, action: 'done' }]);
    expect(reports).toEqual([['call-9', 'done', 200]]);
    expect(traces).toEqual([['sent', 'status-200']]);
  });

  test('a refusal reaches the native side with its status', async () => {
    const { deps, reports, traces } = harness({ post: async () => 410 });
    await runCallActionTask({ callId: 'call-9', token: TOKEN, action: 'snooze' }, deps);
    expect(reports).toEqual([['call-9', 'snooze', 410]]);
    expect(traces).toEqual([['failed', 'status-410']]);
  });

  test('a request that fails or outlives the deadline reports status 0, so the button stays for a retry', async () => {
    const { deps, reports } = harness({
      withTimeout: async () => {
        throw new Error('RTC_TOKEN_TIMEOUT');
      },
    });
    await runCallActionTask({ callId: 'call-9', token: TOKEN, action: 'snooze' }, deps);
    expect(reports).toEqual([['call-9', 'snooze', 0]]);
  });

  test('a task without a valid input posts nothing and never traces the token', async () => {
    const { deps, posted, reports, traces } = harness();
    await runCallActionTask({ callId: 'call-9', token: 'short', action: 'done' }, deps);
    expect(posted).toEqual([]);
    expect(reports).toEqual([]);
    expect(traces).toEqual([['failed', 'bad-input']]);
    expect(JSON.stringify(traces)).not.toContain(TOKEN);
  });

  test('the status read from the answer is the HTTP status, or 0 when nothing answered', () => {
    const answer = (status: number) => ({ ok: status === 200, status, info: null, errors: null });
    expect(callActionStatusOf(answer(200))).toBe(200);
    expect(callActionStatusOf(answer(503))).toBe(503);
    expect(callActionStatusOf(answer(0))).toBe(0);
  });
});
