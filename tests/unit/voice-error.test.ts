import { describe, expect, test } from 'bun:test';
import { voiceErrorMessage } from '@/features/voice/model/voice-error';

const t = ((key: string) => key) as never;

describe('voiceErrorMessage', () => {
  test('a refused microphone says so', () => {
    expect(voiceErrorMessage('MIC_PERMISSION_DENIED|denied', t)).toBe(
      'screens.voice.errors.permission-denied'
    );
  });

  test('a lost or missing socket is a connection problem', () => {
    expect(voiceErrorMessage('SOCKET_LOST|closed', t)).toBe('screens.voice.errors.connection');
    expect(voiceErrorMessage('SOCKET_UNAVAILABLE|no socket', t)).toBe(
      'screens.voice.errors.connection'
    );
  });

  test('a proactive call that went elsewhere or ended is named', () => {
    expect(voiceErrorMessage('CALL_TAKEN|other device', t)).toBe('screens.voice.errors.call-taken');
    expect(voiceErrorMessage('CALL_EXPIRED|missed', t)).toBe('screens.voice.errors.call-missed');
    expect(voiceErrorMessage('CALL_NOT_FOUND|gone', t)).toBe('screens.voice.errors.call-missed');
    expect(voiceErrorMessage('SESSION_REVOKED|closed', t)).toBe(
      'screens.voice.errors.session-revoked'
    );
    expect(voiceErrorMessage('ACCOUNT_DISABLED|off', t)).toBe(
      'screens.voice.errors.account-disabled'
    );
  });

  test('a call another person attends, or that resolved, says so', () => {
    const tp = ((key: string, params?: { name: string }) =>
      params ? `${key}:${params.name}` : key) as never;
    expect(voiceErrorMessage('CALL_ATTENDED|Ana', tp)).toBe(
      'screens.voice.errors.call-attended:Ana'
    );
    expect(voiceErrorMessage('CALL_ATTENDED|', tp)).toBe(
      'screens.voice.errors.call-attended-someone'
    );
    expect(voiceErrorMessage('CALL_RESOLVED|done', tp)).toBe('screens.voice.errors.call-resolved');
  });

  test('anything else is the generic message', () => {
    expect(voiceErrorMessage(null, t)).toBe('screens.voice.errors.generic');
    expect(voiceErrorMessage('VOICE_UNAVAILABLE|503', t)).toBe('screens.voice.errors.generic');
  });
});
