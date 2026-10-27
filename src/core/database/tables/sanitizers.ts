import {
  CONVERSATION_DIRECTIONS,
  CONVERSATION_KINDS,
  CONVERSATION_LEGS,
  CONVERSATION_RECEIPTS,
  CONVERSATION_STATES,
  CONVERSATION_VIAS,
  CREATED_VIA,
  VOICE_NOTE_MIMES,
} from '@/core/types';
import type {
  ConversationDirection,
  ConversationKind,
  ConversationLeg,
  ConversationReceipt,
  ConversationResultFrame,
  ConversationState,
  ConversationVia,
  ConversationVoiceNote,
  CreatedVia,
  RecurrenceException,
  ZonePoint,
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
          typeof (point as ZonePoint).y === 'number'
      )
    : [];

const memberOf = <T extends string>(vocabulary: readonly T[], raw: unknown): T | null =>
  vocabulary.find((entry) => entry === raw) ?? null;

export const sanitizeCreatedVia = (raw: unknown): CreatedVia => memberOf(CREATED_VIA, raw) ?? 'app';

export const sanitizeConversationDirection = (raw: unknown): ConversationDirection =>
  memberOf(CONVERSATION_DIRECTIONS, raw) ?? 'in';

export const sanitizeConversationKind = (raw: unknown): ConversationKind =>
  memberOf(CONVERSATION_KINDS, raw) ?? 'turn';

export const sanitizeConversationLeg = (raw: unknown): ConversationLeg | null =>
  memberOf(CONVERSATION_LEGS, raw);

export const sanitizeConversationState = (raw: unknown): ConversationState =>
  memberOf(CONVERSATION_STATES, raw) ?? 'received';

export const sanitizeConversationVia = (raw: unknown): ConversationVia | null =>
  memberOf(CONVERSATION_VIAS, raw);

export const sanitizeConversationReceipt = (raw: unknown): ConversationReceipt | null =>
  memberOf(CONVERSATION_RECEIPTS, raw);

const VOICE_NOTE_ID = /^[0-9a-f]{32}$/;

const peakOf = (raw: unknown): number =>
  typeof raw === 'number' && Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0;

export const sanitizeVoiceNote = (raw: unknown): ConversationVoiceNote | null => {
  const note = sanitizeObject(raw);
  const mime = memberOf(VOICE_NOTE_MIMES, note.mime);
  const durationMs = note.durationMs;
  if (typeof note.id !== 'string' || !VOICE_NOTE_ID.test(note.id) || mime === null) return null;
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) return null;
  const peaks = Array.isArray(note.peaks) ? note.peaks.map(peakOf) : [];
  return { id: note.id, mime, durationMs: Math.round(durationMs), peaks };
};

const frameIdOf = (raw: unknown): string =>
  typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';

function resultFrameOf(raw: unknown): ConversationResultFrame | null {
  const frame = sanitizeObject(raw);
  const id = frameIdOf(frame.id);
  if (id.length === 0 || typeof frame.tool !== 'string' || typeof frame.ok !== 'boolean')
    return null;
  return { id, tool: frame.tool, ok: frame.ok, data: sanitizeObject(frame.data) };
}

export const sanitizeResultFrames = (raw: unknown): ConversationResultFrame[] | null => {
  if (!Array.isArray(raw)) return null;
  const frames = raw
    .map(resultFrameOf)
    .filter((frame): frame is ConversationResultFrame => frame !== null);
  return frames.length > 0 ? frames : null;
};

const finiteOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const textOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function recurrenceExceptionOf(raw: unknown): RecurrenceException | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const occurrence = finiteOrUndefined(item.occurrence);
  if (occurrence === undefined || occurrence <= 0) return null;
  if (item.cancelled === true) return { occurrence, cancelled: true };
  const exception: RecurrenceException = { occurrence, cancelled: false };
  const startsAt = finiteOrUndefined(item.startsAt);
  const endsAt = finiteOrUndefined(item.endsAt);
  const title = textOrUndefined(item.title);
  const location = textOrUndefined(item.location);
  if (startsAt !== undefined) exception.startsAt = startsAt;
  if (endsAt !== undefined) exception.endsAt = endsAt;
  if (title !== undefined) exception.title = title;
  if (location !== undefined) exception.location = location;
  return Object.keys(exception).length > 2 ? exception : null;
}

export const sanitizeRecurrenceExceptions = (raw: unknown): RecurrenceException[] =>
  Array.isArray(raw)
    ? raw
        .map(recurrenceExceptionOf)
        .filter((exception): exception is RecurrenceException => exception !== null)
        .sort((left, right) => left.occurrence - right.occurrence)
    : [];
