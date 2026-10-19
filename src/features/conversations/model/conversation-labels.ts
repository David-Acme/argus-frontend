import type { IConversationMessageCacheRow } from '@/core/interfaces';
import {
  ARGUS_COUNTERPART_ID,
  type ConversationDeliveryState,
  type ConversationLeg,
  type TranslateFn,
  type TranslationKey,
} from '@/core/types';

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
