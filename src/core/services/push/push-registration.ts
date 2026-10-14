import { notificationTokenBodySchema } from '@/core/contracts/push.contract';
import type { ArgusPushKeys } from '@/core/interfaces';
import type { NotificationTokenBody, NotificationTokenRemoval, PushProvider } from '@/core/types';
import { log } from '@/core/services/log';

export type PushRegistrationInput = {
  token: string;
  keys: ArgusPushKeys;
  platform: string;
  lang: string;
  provider: PushProvider;
};

export type PushUnpairPort = {
  storedToken(): Promise<string | null>;
  unregister(removal: NotificationTokenRemoval): Promise<void>;
  deleteToken(): Promise<void>;
  deleteKeys(): Promise<void>;
};

export function registrationBodyOf(input: PushRegistrationInput): NotificationTokenBody {
  return notificationTokenBodySchema.parse({
    token: input.token,
    platform: input.platform,
    lang: input.lang,
    provider: input.provider,
    publicKey: input.keys.publicKey,
    keyId: input.keys.keyId,
  });
}

async function attempt<T>(step: string, action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    log.error('push', `${step} failed; the unpair goes on`, error);
    return null;
  }
}

export async function unpairPush(port: PushUnpairPort): Promise<void> {
  const token = await attempt('reading the stored token', () => port.storedToken());
  if (token) await attempt('unregistering the token', () => port.unregister({ token }));
  await attempt('deleting the FCM token', () => port.deleteToken());
  await attempt('deleting the keys', () => port.deleteKeys());
}
