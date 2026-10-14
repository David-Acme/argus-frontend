import { describe, expect, test } from 'bun:test';
import { forwardPendingDeclines } from '@/core/services/push/push-registration';
import type { RtcDeclineAnswer } from '@/core/types';
import { declineOncePerSession } from '@/features/voice/model/call-decline';

function recordingPost(answer: RtcDeclineAnswer = { kind: 'declined' }) {
  const posted: string[] = [];
  const post = async (callId: string): Promise<RtcDeclineAnswer> => {
    posted.push(callId);
    return answer;
  };
  return { posted, post };
}

describe('the decline dedup', () => {
  test('a callId drained from takeDeclines and also delivered live is POSTed once', async () => {
    const { posted, post } = recordingPost();
    const send = declineOncePerSession(post);
    const pending: Promise<unknown>[] = [];
    forwardPendingDeclines(
      () => ['call-41'],
      (callId) => pending.push(send(callId))
    );
    pending.push(send('call-41'));
    await Promise.all(pending);
    expect(posted).toEqual(['call-41']);
  });

  test('a live decline followed by the same drained decline is POSTed once', async () => {
    const { posted, post } = recordingPost();
    const send = declineOncePerSession(post);
    await send('rtc-' + 'a'.repeat(32));
    forwardPendingDeclines(
      () => ['rtc-' + 'a'.repeat(32)],
      (callId) => void send(callId)
    );
    expect(posted).toEqual(['rtc-' + 'a'.repeat(32)]);
  });

  test('a callId whose first POST was refused is not sent again in this session', async () => {
    const { posted, post } = recordingPost({ kind: 'refused', code: 'NETWORK_ERROR', message: '' });
    const send = declineOncePerSession(post);
    expect((await send('call-41'))?.kind).toBe('refused');
    expect(await send('call-41')).toBeNull();
    expect(posted).toEqual(['call-41']);
  });

  test('different calls are each POSTed once', async () => {
    const { posted, post } = recordingPost();
    const send = declineOncePerSession(post);
    await send('call-41');
    await send('call-42');
    await send('call-41');
    await send('call-42');
    expect(posted).toEqual(['call-41', 'call-42']);
  });
});
