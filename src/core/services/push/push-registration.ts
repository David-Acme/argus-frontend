import { notificationTokenBodySchema } from '@/core/contracts/push.contract';
import type { ArgusPushKeys } from '@/core/interfaces';
import type { AuthStatus, NotificationTokenBody, NotificationTokenRemoval, PushProvider } from '@/core/types';
import { log } from '@/core/services/log';

export type PushRegistrationInput = {
  token: string;
  keys: ArgusPushKeys;
  platform: string;
  lang: string;
  provider: PushProvider;
};

export const UNREGISTER_TIMEOUT_MS = 5000;

const SESSION_MISSING_CODES: ReadonlySet<string> = new Set(['PAIRING_REQUIRED', 'UNAUTHORIZED']);

export function isSessionMissing(code: string | null | undefined): boolean {
  return code != null && SESSION_MISSING_CODES.has(code);
}

export function hasSession(status: AuthStatus): boolean {
  return status === 'signed-in';
}

export function onTokenRotated(status: AuthStatus, register: () => void): boolean {
  if (!hasSession(status)) return false;
  register();
  return true;
}

export function registrationDue(previous: AuthStatus | null, next: AuthStatus): boolean {
  return hasSession(next) && !(previous !== null && hasSession(previous));
}

export type PushUnpairPort = {
  storedToken(): Promise<string | null>;
  unregister(removal: NotificationTokenRemoval): Promise<void>;
  deleteToken(): Promise<void>;
  deleteKeys(): Promise<void>;
  unregisterTimeoutMs?: number;
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

export function forwardPendingDeclines(take: () => string[], emit: (callId: string) => void): void {
  let callIds: string[];
  try {
    callIds = take();
  } catch (error) {
    log.error('push', 'the pending declines could not be read', error);
    return;
  }
  for (const callId of callIds) emit(callId);
}

function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('the request timed out')), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

export async function unpairPush(port: PushUnpairPort): Promise<void> {
  const token = await attempt('reading the stored token', () => port.storedToken());
  if (token)
    await attempt('unregistering the token', () =>
      withDeadline(port.unregister({ token }), port.unregisterTimeoutMs ?? UNREGISTER_TIMEOUT_MS)
    );
  await attempt('deleting the FCM token', () => port.deleteToken());
  await attempt('deleting the keys', () => port.deleteKeys());
}
