import { describe, expect, test } from 'bun:test';
import {
  notificationTokenBodySchema,
  notificationTokenRegisteredSchema,
  notificationTokenRemovalSchema,
  notificationTokenRemovedSchema,
  PUSH_PROVIDERS,
} from '@/core/contracts/push.contract';
import { callDeclinedSchema, callDeclineRequestSchema } from '@/core/contracts/rtc.contract';

const BODY = {
  token: 'fcm-token-1',
  platform: 'android',
  lang: 'es',
  provider: 'fcm',
  publicKey: 'A'.repeat(43),
  keyId: 'B'.repeat(22),
};

describe('the widened notification token registration', () => {
  test('the provider set is the one the backend names', () => {
    expect([...PUSH_PROVIDERS]).toEqual(['fcm', 'apns', 'apns_voip']);
  });

  test('the full body parses, and every new field is required', () => {
    expect(notificationTokenBodySchema.parse(BODY)).toEqual(BODY);
    for (const field of ['provider', 'publicKey', 'keyId'] as const) {
      const rest: Record<string, unknown> = { ...BODY };
      delete rest[field];
      expect(notificationTokenBodySchema.safeParse(rest).success).toBe(false);
    }
  });

  test('the public key is exactly 43 base64url characters and the key id exactly 22', () => {
    expect(notificationTokenBodySchema.safeParse({ ...BODY, publicKey: 'A'.repeat(44) }).success).toBe(false);
    expect(notificationTokenBodySchema.safeParse({ ...BODY, publicKey: `${'A'.repeat(42)}=` }).success).toBe(false);
    expect(notificationTokenBodySchema.safeParse({ ...BODY, keyId: 'B'.repeat(23) }).success).toBe(false);
  });

  test('a provider outside the set is refused', () => {
    expect(notificationTokenBodySchema.safeParse({ ...BODY, provider: 'webpush' }).success).toBe(false);
  });

  test('the answer is registered: true', () => {
    expect(notificationTokenRegisteredSchema.parse({ registered: true })).toEqual({ registered: true });
    expect(notificationTokenRegisteredSchema.safeParse({ registered: false }).success).toBe(false);
  });
});

describe('the notification token removal', () => {
  test('the body names the token and nothing else is required', () => {
    expect(notificationTokenRemovalSchema.parse({ token: 'fcm-token-1' })).toEqual({ token: 'fcm-token-1' });
    expect(notificationTokenRemovalSchema.safeParse({}).success).toBe(false);
    expect(notificationTokenRemovalSchema.safeParse({ token: '' }).success).toBe(false);
  });

  test('the answer says whether a row was deleted', () => {
    expect(notificationTokenRemovedSchema.parse({ deleted: true })).toEqual({ deleted: true });
    expect(notificationTokenRemovedSchema.parse({ deleted: false })).toEqual({ deleted: false });
    expect(notificationTokenRemovedSchema.safeParse({}).success).toBe(false);
  });
});

describe('the call decline', () => {
  test('the request names a well-formed call id', () => {
    expect(callDeclineRequestSchema.parse({ callId: 'call-41' })).toEqual({ callId: 'call-41' });
    expect(callDeclineRequestSchema.parse({ callId: `rtc-${'a'.repeat(32)}` })).toEqual({
      callId: `rtc-${'a'.repeat(32)}`,
    });
    expect(callDeclineRequestSchema.safeParse({ callId: '../settings' }).success).toBe(false);
  });

  test('the answer says whether the ring was declined', () => {
    expect(callDeclinedSchema.parse({ declined: true })).toEqual({ declined: true });
    expect(callDeclinedSchema.safeParse({ declined: 'yes' }).success).toBe(false);
  });
});
