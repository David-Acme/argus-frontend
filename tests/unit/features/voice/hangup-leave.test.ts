import { describe, expect, test } from 'bun:test';
import {
  boundedRelease,
  leaveThenRelease,
  sendHangupThenLeave,
  type HangupCall,
} from '@/features/voice/model/hangup-leave';

const recorder = (sendFails: boolean, leaveFails = false) => {
  const events: string[] = [];
  const call: HangupCall = {
    send: async (topic) => {
      events.push(`send:${topic}`);
      if (sendFails) throw new Error('RTC_NOT_CONNECTED');
    },
    leave: async () => {
      events.push('leave');
      if (leaveFails) throw new Error('RTC_LEAVE_FAILED');
    },
  };
  const wait = async (ms: number) => {
    events.push(`wait:${ms}`);
  };
  const fallback = () => {
    events.push('fallback');
  };
  const release = () => {
    events.push('release');
  };
  return { call, wait, fallback, release, events };
};

describe('the hang-up reaches the agent before the room is left', () => {
  test('the hang-up is sent, the flush is awaited, the room is left, and only then the ongoing call is released', async () => {
    const { call, wait, fallback, release, events } = recorder(false);
    const sent: boolean[] = [];
    await sendHangupThenLeave({ call, flushMs: 400, wait, fallback, release, onSent: (value) => sent.push(value) });
    expect(events).toEqual(['send:argus.hangup', 'wait:400', 'leave', 'release']);
    expect(sent).toEqual([true]);
  });

  test('a hang-up that cannot be sent on a room not yet connected falls back to the sync stop, then still leaves the room', async () => {
    const { call, wait, fallback, release, events } = recorder(true);
    const sent: boolean[] = [];
    await sendHangupThenLeave({ call, flushMs: 400, wait, fallback, release, onSent: (value) => sent.push(value) });
    expect(events).toEqual(['send:argus.hangup', 'fallback', 'wait:400', 'leave', 'release']);
    expect(sent).toEqual([false]);
  });

  test('a room that fails to leave still releases the ongoing call', async () => {
    const { call, wait, fallback, release, events } = recorder(false, true);
    await expect(
      sendHangupThenLeave({ call, flushMs: 400, wait, fallback, release, onSent: () => undefined }),
    ).rejects.toThrow('RTC_LEAVE_FAILED');
    expect(events.at(-1)).toBe('release');
    const quiet = recorder(false, true);
    await expect(leaveThenRelease({ call: quiet.call, release: quiet.release })).rejects.toThrow('RTC_LEAVE_FAILED');
    expect(quiet.events).toEqual(['leave', 'release']);
  });

  test('the ongoing call is released once, by the leave or by the bound, whichever comes first', () => {
    let released = 0;
    let bound: (() => void) | null = null;
    const release = boundedRelease(
      () => {
        released += 1;
      },
      3000,
      (run, ms) => {
        expect(ms).toBe(3000);
        bound = run;
      },
    );
    release();
    (bound as (() => void) | null)?.();
    release();
    expect(released).toBe(1);
  });
});
