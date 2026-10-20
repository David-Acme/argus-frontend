import { VISITOR_CONSENTS, type IconName, type VisitorConsent, type WatchReplyState } from '@/core/types';

export const WATCH_NOTIFICATION_KINDS = [
  'watch_busy',
  'watch_resume',
  'watch_details',
  'watch_confirm',
  'watch_message',
] as const;

export type WatchNotificationKind = (typeof WATCH_NOTIFICATION_KINDS)[number];

export const WATCH_NOTIFICATION_ICONS = {
  watch_busy: 'ear',
  watch_resume: 'smartphone',
  watch_details: 'audio-lines',
  watch_confirm: 'shield-check',
  watch_message: 'messages-square',
} as const satisfies Record<WatchNotificationKind, IconName>;

export type WatchNotificationAction =
  | { kind: 'continue'; conversationId: string }
  | { kind: 'transcript' }
  | { kind: 'open'; href: string };

type NotificationData = Readonly<Record<string, unknown>>;

const IN_APP_PATH = /^\/(?!\/)[A-Za-z0-9/_-]{1,200}$/;

const text = (data: NotificationData, field: string): string | null => {
  const value = data[field];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function watchNotificationKind(kind: string | null): WatchNotificationKind | null {
  return WATCH_NOTIFICATION_KINDS.find((entry) => entry === kind) ?? null;
}

export function watchNotificationAction(
  kind: string | null,
  data: NotificationData
): WatchNotificationAction | null {
  const known = watchNotificationKind(kind);
  if (known === null) return null;
  const conversationId = text(data, 'conversationId');
  if (known === 'watch_busy' || known === 'watch_resume') {
    return conversationId ? { kind: 'continue', conversationId } : { kind: 'transcript' };
  }
  if (known === 'watch_details') return { kind: 'transcript' };
  const href = text(data, 'url');
  if (known === 'watch_confirm') return href && IN_APP_PATH.test(href) ? { kind: 'open', href } : null;
  return null;
}

export type VisitorMessage = {
  conversationId: string;
  cameraName: string | null;
  replyUntil: number | null;
  consent: VisitorConsent | null;
};

export type WatchReplyOutcome = WatchReplyState | 'gone' | 'closed' | 'too-long' | 'failed';

const epochMs = (data: NotificationData, field: string): number | null => {
  const value = data[field];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value * 1000 : null;
};

export function visitorConsentOf(data: NotificationData): VisitorConsent | null {
  const value = data.visitorConsent;
  return VISITOR_CONSENTS.find((consent) => consent === value) ?? null;
}

export function visitorMessageOf(kind: string | null, data: NotificationData): VisitorMessage | null {
  if (watchNotificationKind(kind) !== 'watch_message') return null;
  const conversationId = text(data, 'conversationId');
  if (conversationId === null) return null;
  return {
    conversationId,
    cameraName: text(data, 'cameraName'),
    replyUntil: epochMs(data, 'replyUntil'),
    consent: visitorConsentOf(data),
  };
}

export function canReply(message: Pick<VisitorMessage, 'replyUntil'>, now: number): boolean {
  return message.replyUntil !== null && message.replyUntil > now;
}

export function watchReplyOutcome(
  result: { ok: boolean; status: number; info: { state: WatchReplyState } | null }
): WatchReplyOutcome {
  if (result.ok && result.info) return result.info.state;
  if (result.status === 404) return 'gone';
  if (result.status === 410) return 'closed';
  if (result.status === 422) return 'too-long';
  return 'failed';
}
