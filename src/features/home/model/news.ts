import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import type { AvatarTone } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import {
  isThreadRead,
  messageCounterpartOf,
  missedCallId,
  moduleRequestOf,
  type NotificationThread,
} from '@/features/home/model/notification-threads';

export const NEWS_ROUTE = '/notification';

export const NEWS_STACK_LIMIT = 5;

export const NEWS_COLUMN_ROW_PX = 100;

export type NewsAction = 'module' | 'review' | 'reply' | null;

export type NewsWords = { who: string; text: string };

export type NewsAvatar = { icon?: IconGlyph; argus?: true; tone: AvatarTone };

export type NewsStamp =
  | { kind: 'today'; at: Date }
  | { kind: 'yesterday'; at: Date }
  | { kind: 'week'; at: Date }
  | { kind: 'older'; at: Date };

type Thread = Pick<NotificationThread, 'kind' | 'latest' | 'urgency' | 'phase'>;

const KIND_ICONS: Readonly<Record<string, IconGlyph>> = {
  guard_episode: 'alert',
  guard_tamper: 'eyeoff',
  guard_tamper_ask: 'eyeoff',
  maintenance_view_check: 'sliders',
  camera_maintenance_notice: 'sliders',
  guard_arrival: 'door',
  camera_fallback: 'cam',
  camera_fallback_digest: 'hist',
  camera_privacy_coverage: 'lock',
  agenda_event: 'cal',
  call: 'phone',
  module_request: 'user',
  household_message: 'users',
  watch_busy: 'mic',
  watch_resume: 'devices',
  watch_details: 'speaker',
  watch_confirm: 'shieldok',
  watch_message: 'send',
};

const ARGUS_KINDS: ReadonlySet<string> = new Set(['assistant_task', 'guard_digest']);

const REVIEW_KINDS: ReadonlySet<string> = new Set(['guard_episode', 'guard_tamper']);

const DAY_MS = 86_400_000;

const WEEK_DAYS = 7;

export function newsLimit(column: boolean, height: number): number {
  if (!column) return NEWS_STACK_LIMIT;
  return Math.max(NEWS_STACK_LIMIT, Math.round(height / NEWS_COLUMN_ROW_PX));
}

function toneOf(thread: Pick<Thread, 'kind' | 'urgency'>): AvatarTone {
  if (thread.urgency === 'critical') return 'alert';
  if (thread.urgency === 'time_sensitive') return 'attn';
  return thread.kind === 'module_request' ? 'accent' : 'default';
}

export function newsAvatarOf(thread: Pick<Thread, 'kind' | 'phase' | 'urgency'>): NewsAvatar {
  const tone = toneOf(thread);
  if (thread.phase === 'after_quiet') return { icon: 'moon', tone };
  if (thread.kind !== null && ARGUS_KINDS.has(thread.kind)) return { argus: true, tone };
  return { icon: (thread.kind && KIND_ICONS[thread.kind]) || 'bell', tone };
}

export function newsWordsOf(
  latest: Pick<INotificationPreviewCacheRow, 'title' | 'body'>,
  sender: string,
  title: string | null = null
): NewsWords {
  const heading = (title ?? latest.title).trim();
  const body = latest.body.trim();
  return body.length > 0 ? { who: heading, text: body } : { who: sender, text: heading };
}

export function newsTargetOf(
  thread: Thread,
  hrefOf: (data: Readonly<Record<string, unknown>>) => string
): string | null {
  const callId = missedCallId(thread);
  if (callId) return `/call?callId=${callId}`;
  const href = hrefOf(thread.latest.data);
  return href === '/' ? null : href;
}

export function newsActionOf(
  thread: Thread,
  target: string | null,
  offersModule: (moduleId: string) => boolean
): NewsAction {
  const request = moduleRequestOf(thread);
  if (request && offersModule(request.moduleId)) return 'module';
  if (target === null) return null;
  if (messageCounterpartOf(thread) !== null) return 'reply';
  return thread.kind !== null && REVIEW_KINDS.has(thread.kind) ? 'review' : null;
}

export const newsPressable = (
  thread: Pick<NotificationThread, 'unreadIds'>,
  target: string | null
): boolean => target !== null || !isThreadRead(thread);

const startOfDay = (value: Date): number =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

export function newsStampOf(at: number, now: number): NewsStamp | null {
  if (!at) return null;
  const date = new Date(at);
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(date)) / DAY_MS);
  if (days <= 0) return { kind: 'today', at: date };
  if (days === 1) return { kind: 'yesterday', at: date };
  if (days < WEEK_DAYS) return { kind: 'week', at: date };
  return { kind: 'older', at: date };
}
