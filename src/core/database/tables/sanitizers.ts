import {
  CONVERSATION_DIRECTIONS,
  CONVERSATION_KINDS,
  CONVERSATION_LEGS,
  CONVERSATION_STATES,
  type ConversationDirection,
  type ConversationKind,
  type ConversationLeg,
  type ConversationState,
  type ZonePoint,
} from '@/core/types';

export const sanitizeStringArray = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];

export const sanitizeObject = (raw: unknown): Record<string, unknown> =>
  typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};

export const sanitizeZonePoints = (raw: unknown): ZonePoint[] =>
  Array.isArray(raw)
    ? raw.filter(
        (point): point is ZonePoint =>
          typeof point === 'object' &&
          point !== null &&
          typeof (point as ZonePoint).x === 'number' &&
          typeof (point as ZonePoint).y === 'number',
      )
    : [];

const memberOf = <T extends string>(vocabulary: readonly T[], raw: unknown): T | null =>
  vocabulary.find((entry) => entry === raw) ?? null;

export const sanitizeConversationDirection = (raw: unknown): ConversationDirection =>
  memberOf(CONVERSATION_DIRECTIONS, raw) ?? 'in';

export const sanitizeConversationKind = (raw: unknown): ConversationKind =>
  memberOf(CONVERSATION_KINDS, raw) ?? 'turn';

export const sanitizeConversationLeg = (raw: unknown): ConversationLeg | null => memberOf(CONVERSATION_LEGS, raw);

export const sanitizeConversationState = (raw: unknown): ConversationState =>
  memberOf(CONVERSATION_STATES, raw) ?? 'received';
