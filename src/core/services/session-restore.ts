import type { IAuthUser } from '@/core/interfaces';
import type { NetPairedInstance } from '@/core/types';
import { NET_STORAGE_KEYS } from '@/shared/constants';
import type { TraceOutcome } from './native-trace.types';
import { traceReasonOf } from './native-trace-reason';

export type StoredSessionReading = {
  instance: NetPairedInstance | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceCredential: string | null;
  user: IAuthUser | null;
};

export type RestoreDecision =
  | { kind: 'session' }
  | { kind: 'absent' }
  | { kind: 'partial'; reason: 'missing-instance' | 'missing-tokens' | 'missing-user' };

export const RESTORE_RETRY_CAP_MS = 30_000;
export const RESTORE_READ_ATTEMPTS = 4;
const RESTORE_RETRY_BASE_MS = 1_000;

export type RestoreCause = 'session' | 'fresh' | 'vanished' | 'unpaired' | 'incomplete' | 'unreadable';

export type RestoreFailureKind = 'keystore' | 'decrypt' | 'unknown';

export type RestoreFailure = {
  kind: RestoreFailureKind;
  key: string | null;
  message: string;
};

export type RestoreReport = {
  decision: RestoreDecision | null;
  cause: RestoreCause;
  outcome: TraceOutcome;
  reason: string;
  lostKeys: string[];
  remembered: boolean;
  warnings: string[];
};

export type StoredSessionAttempt = {
  reading: StoredSessionReading | null;
  failures: readonly RestoreFailure[];
};

type SessionEntry = {
  key: string;
  name: string;
  stored: (reading: StoredSessionReading) => string | null;
};

const SESSION_ENTRIES: readonly SessionEntry[] = [
  { key: NET_STORAGE_KEYS.accessToken, name: 'access-token', stored: (reading) => reading.accessToken },
  { key: NET_STORAGE_KEYS.refreshToken, name: 'refresh-token', stored: (reading) => reading.refreshToken },
  { key: NET_STORAGE_KEYS.deviceCredential, name: 'device-credential', stored: (reading) => reading.deviceCredential },
];

const SECURE_STORE_MODULE = 'SecureStoreModule (ExpoSecureStore)';
const KEY_IN_MESSAGE = /for key '([^']+)'/;

export type RestoreEntryInput = {
  paired: boolean;
  report: RestoreReport | null;
};

export type RestoreEntry = 'restore' | 'login';

export function restoreEntryOf({ paired, report }: RestoreEntryInput): RestoreEntry {
  if (!paired || report === null) return 'login';
  if (report.cause === 'vanished' || report.cause === 'unreadable') return 'restore';
  return report.cause === 'incomplete' && report.remembered ? 'restore' : 'login';
}

export function decideRestore(reading: StoredSessionReading): RestoreDecision {
  const { instance, accessToken, refreshToken, deviceCredential, user } = reading;
  if (instance && accessToken && refreshToken && user) return { kind: 'session' };
  if (!instance && !accessToken && !refreshToken && !deviceCredential && !user) return { kind: 'absent' };
  if (!instance) return { kind: 'partial', reason: 'missing-instance' };
  if (!accessToken || !refreshToken) return { kind: 'partial', reason: 'missing-tokens' };
  return { kind: 'partial', reason: 'missing-user' };
}

export function restoreRetryDelayMs(attempt: number): number {
  return Math.min(RESTORE_RETRY_CAP_MS, RESTORE_RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1));
}

export function nullStoredKeys(reading: StoredSessionReading): string[] {
  const names: string[] = [];
  if (reading.instance === null) names.push('instance');
  for (const entry of SESSION_ENTRIES) {
    if (entry.stored(reading) === null) names.push(entry.name);
  }
  if (reading.user === null) names.push('user');
  return names;
}

export function lostSessionKeys(reading: StoredSessionReading): string[] {
  return SESSION_ENTRIES.filter((entry) => entry.stored(reading) === null).map((entry) => entry.name);
}

export function sessionKeyName(key: string | null): string | null {
  return SESSION_ENTRIES.find((entry) => entry.key === key)?.name ?? null;
}

export function restoreFailureOf(error: unknown): RestoreFailure {
  const message = error instanceof Error ? error.message : String(error);
  const key = KEY_IN_MESSAGE.exec(message)?.[1] ?? null;
  if (message.includes('keystore')) return { kind: 'keystore', key, message };
  if (message.includes('decrypt')) return { kind: 'decrypt', key, message };
  return { kind: 'unknown', key, message };
}

export function secureStoreWarning(key: string | null, message: string): string {
  const named = key === null ? 'the stored session' : `key '${key}'`;
  return `${SECURE_STORE_MODULE} refused the read for ${named}: ${message}`;
}

function failureWarnings(failures: readonly RestoreFailure[]): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const failure of failures) {
    const signature = `${failure.key ?? ''}|${failure.message}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    warnings.push(secureStoreWarning(failure.key, failure.message));
  }
  return warnings;
}

export function vanishedEntryWarning(key: string): string {
  return (
    `${SECURE_STORE_MODULE} removed the entry for key '${key}': a remembered account expects it, ` +
    'but it cannot be decrypted without its keystore key (an app reinstall, or a restore that did not carry the key), ' +
    'so the library returns null.'
  );
}

export function restoreReport(attempt: StoredSessionAttempt): RestoreReport {
  const { reading, failures } = attempt;

  if (reading === null) {
    const failure = failures[failures.length - 1];
    const named = sessionKeyName(failure?.key ?? null);
    return {
      decision: null,
      cause: 'unreadable',
      outcome: 'error',
      reason: traceReasonOf(`securestore-${failure?.kind ?? 'unreadable'}-${named ?? 'session'}`),
      lostKeys: [],
      remembered: false,
      warnings: failureWarnings(failures),
    };
  }

  const decision = decideRestore(reading);
  if (decision.kind === 'session') {
    return { decision, cause: 'session', outcome: 'ok', reason: 'session', lostKeys: [], remembered: true, warnings: [] };
  }
  if (decision.kind === 'absent') {
    return { decision, cause: 'fresh', outcome: 'absent', reason: 'none', lostKeys: [], remembered: false, warnings: [] };
  }

  const lostKeys = lostSessionKeys(reading);
  const remembered = reading.user !== null || reading.deviceCredential !== null;
  if (decision.reason === 'missing-instance') {
    return {
      decision,
      cause: 'unpaired',
      outcome: 'partial',
      reason: traceReasonOf(nullStoredKeys(reading).join('-') || decision.reason),
      lostKeys,
      remembered,
      warnings: [],
    };
  }
  if (lostKeys.length > 0 && remembered) {
    return {
      decision,
      cause: 'vanished',
      outcome: 'error',
      reason: traceReasonOf(`keystore-lost-${lostKeys.join('-')}`),
      lostKeys,
      remembered,
      warnings: SESSION_ENTRIES.filter((entry) => entry.stored(reading) === null).map((entry) =>
        vanishedEntryWarning(entry.key)
      ),
    };
  }

  return {
    decision,
    cause: 'incomplete',
    outcome: 'partial',
    reason: traceReasonOf(nullStoredKeys(reading).join('-') || decision.reason),
    lostKeys,
    remembered,
    warnings: [],
  };
}
