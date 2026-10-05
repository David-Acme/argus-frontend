import type { IHeartbeatRecord } from '@/core/interfaces';
import type { DeadmanPlan, WatchdogNotice } from '@/core/types';
import { HEARTBEAT_DEFAULTS, HEARTBEAT_MIN_INTERVAL_SECONDS } from '@/shared/constants';

export type WatchdogNoticeInput = {
  record: IHeartbeatRecord | null;
  connected: boolean;
  disconnectedAt: number | null;
  now: number;
};

const SECOND_MS = 1000;

export const planFor = (record: IHeartbeatRecord): DeadmanPlan =>
  record.beat.armed
    ? {
        kind: 'arm',
        fireAt: record.receivedAt + record.beat.graceSeconds * SECOND_MS,
        lastHeardAt: record.receivedAt,
      }
    : { kind: 'disarm' };

export const pingIntervalMs = (record: IHeartbeatRecord | null): number =>
  Math.max(
    HEARTBEAT_MIN_INTERVAL_SECONDS,
    record?.beat.intervalSeconds ?? HEARTBEAT_DEFAULTS.intervalSeconds
  ) * SECOND_MS;

export const socketGraceMs = (record: IHeartbeatRecord | null): number =>
  (record?.beat.socketGraceSeconds ?? HEARTBEAT_DEFAULTS.socketGraceSeconds) * SECOND_MS;

export const watchdogNotice = ({
  record,
  connected,
  disconnectedAt,
  now,
}: WatchdogNoticeInput): WatchdogNotice => {
  if (!connected) {
    const since = record?.receivedAt ?? disconnectedAt;
    if (since === null || since === undefined) return { kind: 'none' };
    const quietSince = Math.max(since, disconnectedAt ?? since);
    return now - quietSince >= socketGraceMs(record) ? { kind: 'silent', since } : { kind: 'none' };
  }
  return { kind: 'none' };
};

export const nextNoticeCheckMs = (input: WatchdogNoticeInput): number | null => {
  if (input.connected) return null;
  const since = input.record?.receivedAt ?? input.disconnectedAt;
  if (since === null || since === undefined) return null;
  const quietSince = Math.max(since, input.disconnectedAt ?? since);
  const due = quietSince + socketGraceMs(input.record) - input.now;
  return due > 0 ? due : null;
};

export const readPushHeartbeat = (data: unknown): unknown => {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const candidate =
    record.kind === 'heartbeat'
      ? record
      : typeof record.data === 'object' && record.data !== null
        ? (record.data as Record<string, unknown>)
        : typeof record.body === 'string'
          ? safeParse(record.body)
          : null;
  if (!candidate || typeof candidate !== 'object') return null;
  return (candidate as Record<string, unknown>).kind === 'heartbeat' ? candidate : null;
};

const safeParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
