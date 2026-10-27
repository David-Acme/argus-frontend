import type { IConversationMessageCacheRow } from '@/core/interfaces';
import {
  ARGUS_COUNTERPART_ID,
  type ConversationDeliveryState,
  type ConversationLeg,
  type TranslateFn,
  type TranslationKey,
} from '@/core/types';
import type { BubbleStatus } from '@/features/conversations/model/receipts';

export const DELIVERY_STATE_KEYS = {
  sent: 'screens.conversations.state.sent',
  delivered: 'screens.conversations.state.delivered',
  notified: 'screens.conversations.state.notified',
  answered: 'screens.conversations.state.answered',
  expired: 'screens.conversations.state.expired',
} as const satisfies Record<ConversationDeliveryState, TranslationKey>;

export const LEG_KEYS = {
  camera: 'screens.conversations.leg.camera',
  phone: 'screens.conversations.leg.phone',
  laptop: 'screens.conversations.leg.laptop',
} as const satisfies Record<ConversationLeg, TranslationKey>;

export const STATUS_KEYS = {
  sending: 'screens.conversations.status.sending',
  sent: 'screens.conversations.status.sent',
  delivered: 'screens.conversations.status.delivered',
  read: 'screens.conversations.status.read',
  failed: 'screens.conversations.status.failed',
} as const satisfies Record<BubbleStatus, TranslationKey>;

export function bubbleNoteOf(
  message: Pick<IConversationMessageCacheRow, 'kind' | 'leg' | 'via' | 'voiceNote'>,
  t: TranslateFn
): string | null {
  if (message.kind === 'turn' && message.leg === 'camera') return t(LEG_KEYS.camera);
  if (message.via === 'voice' && !message.voiceNote) return t('screens.conversations.by-voice');
  return null;
}

export const spokenOf = (parts: readonly (string | null)[]): string =>
  parts.filter((part): part is string => Boolean(part)).join('. ');

export const isArgus = (counterpartId: number): boolean => counterpartId === ARGUS_COUNTERPART_ID;

export function counterpartNameOf(counterpartId: number, name: string, t: TranslateFn): string {
  if (isArgus(counterpartId)) return t('screens.conversations.argus');
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : t('screens.conversations.someone-home');
}

export function previewOf(
  message: Pick<IConversationMessageCacheRow, 'direction' | 'kind' | 'body'>,
  t: TranslateFn
): string {
  const body = message.body.replace(/\s+/g, ' ').trim();
  if (message.kind === 'visitor' && body.length === 0) return t('screens.conversations.visitor');
  return message.direction === 'out' ? t('screens.conversations.you', { body }) : body;
}
