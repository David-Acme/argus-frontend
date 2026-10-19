import type { ConversationDeliveryState, ConversationLeg, IconName } from '@/core/types';

export const DELIVERY_STATE_ICONS = {
  sent: 'clock',
  delivered: 'check',
  notified: 'bell',
  answered: 'check-circle',
  expired: 'minus',
} as const satisfies Record<ConversationDeliveryState, IconName>;

export const LEG_ICONS = {
  camera: 'video',
  phone: 'smartphone',
  laptop: 'laptop',
} as const satisfies Record<ConversationLeg, IconName>;

export const ARGUS_ICON: IconName = 'sparkles';

export const MEMBER_ICON: IconName = 'user';

export const UNREAD_BADGE_MAX = 99;
