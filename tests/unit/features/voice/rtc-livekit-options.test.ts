import { describe, expect, test } from 'bun:test';
import { connectOptionsOf } from '@/features/voice/services/rtc/rtc-livekit';

const join = { url: 'wss://argus.local:7046', token: 'jwt', agentIdentity: 'argus-voice' };

describe('livekit connect options', () => {
  test('a join without relays keeps the server-side ICE servers', () => {
    expect(connectOptionsOf(join)).toEqual({ autoSubscribe: true });
    expect(connectOptionsOf({ ...join, iceServers: [] })).toEqual({ autoSubscribe: true });
  });

  test('a join with relays hands them to the peer connection', () => {
    const iceServers = [{ urls: ['turn:turn.example:3478?transport=udp'], username: 'u', credential: 'c' }];
    expect(connectOptionsOf({ ...join, iceServers })).toEqual({
      autoSubscribe: true,
      rtcConfig: { iceServers },
    });
  });
});
