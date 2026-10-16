import { describe, expect, test } from 'bun:test';
import { sendHangupThenLeave, type HangupCall } from '@/features/voice/model/hangup-leave';

const recorder = (sendFails: boolean) => {
  const events: string[] = [];
  const call: HangupCall = {
    send: async (topic) => {
      events.push(`send:${topic}`);
      if (sendFails) throw new Error('RTC_NOT_CONNECTED');
    },
    leave: async () => {
      events.push('leave');
    },
  };
  const wait = async (ms: number) => {
    events.push(`wait:${ms}`);
  };
  const fallback = () => {
    events.push('fallback');
  };
  return { call, wait, fallback, events };
};

describe('the hang-up reaches the agent before the room is left', () => {
  test('the hang-up is sent, the flush is awaited, and only then the room is left', async () => {
    const { call, wait, fallback, events } = recorder(false);
    const sent: boolean[] = [];
    await sendHangupThenLeave({ call, flushMs: 400, wait, fallback, onSent: (value) => sent.push(value) });
    expect(events).toEqual(['send:argus.hangup', 'wait:400', 'leave']);
    expect(sent).toEqual([true]);
  });

  test('a hang-up that cannot be sent on a room not yet connected falls back to the sync stop, then still leaves the room', async () => {
    const { call, wait, fallback, events } = recorder(true);
    const sent: boolean[] = [];
    await sendHangupThenLeave({ call, flushMs: 400, wait, fallback, onSent: (value) => sent.push(value) });
    expect(events).toEqual(['send:argus.hangup', 'fallback', 'wait:400', 'leave']);
    expect(sent).toEqual([false]);
  });
});
