import { describe, expect, test } from 'bun:test';
import { sendHangupThenLeave, type HangupCall } from '@/features/voice/model/hangup-leave';

const recorder = (sendFails: boolean) => {
  const events: string[] = [];
  const call: HangupCall = {
    send: async (topic) => {
      events.push(`send:${topic}`);
      if (sendFails) throw new Error('no route');
    },
    leave: async () => {
      events.push('leave');
    },
  };
  const wait = async (ms: number) => {
    events.push(`wait:${ms}`);
  };
  return { call, wait, events };
};

describe('the hang-up reaches the agent before the room is left', () => {
  test('the hang-up is sent, the flush is awaited, and only then the room is left', async () => {
    const { call, wait, events } = recorder(false);
    const sent: boolean[] = [];
    await sendHangupThenLeave({ call, flushMs: 400, wait, onSent: (value) => sent.push(value) });
    expect(events).toEqual(['send:argus.hangup', 'wait:400', 'leave']);
    expect(sent).toEqual([true]);
  });

  test('a hang-up that fails to send is reported, and the room is still left', async () => {
    const { call, wait, events } = recorder(true);
    const sent: boolean[] = [];
    await sendHangupThenLeave({ call, flushMs: 400, wait, onSent: (value) => sent.push(value) });
    expect(events).toEqual(['send:argus.hangup', 'wait:400', 'leave']);
    expect(sent).toEqual([false]);
  });
});
