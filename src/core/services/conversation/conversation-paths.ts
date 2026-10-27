export const CONVERSATION_PATH = '/conversation';

export const validCounterpartId = (value: unknown): number | null => {
  const id = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof id === 'number' && Number.isSafeInteger(id) && id >= 0 ? id : null;
};

export const conversationThreadPath = (counterpartId: number): string =>
  `${CONVERSATION_PATH}/${encodeURIComponent(String(counterpartId))}`;

export const conversationReadPath = (counterpartId: number): string => `${conversationThreadPath(counterpartId)}/read`;

export const conversationMessagePath = (counterpartId: number): string =>
  `${conversationThreadPath(counterpartId)}/message`;

export const conversationDeliveredPath = (counterpartId: number): string =>
  `${conversationThreadPath(counterpartId)}/delivered`;

export const conversationVoiceNotePath = (counterpartId: number): string =>
  `${conversationThreadPath(counterpartId)}/voice-note`;

export const voiceNotePlayPath = (noteId: string): string =>
  `${CONVERSATION_PATH}/voice-note/${encodeURIComponent(noteId)}/play`;

export const voiceNoteContentPath = (token: string): string =>
  `${CONVERSATION_PATH}/voice-note/${encodeURIComponent(token)}/content`;

export const CONVERSATION_MESSAGE_MAX_CHARS = 500;

export const VOICE_NOTE_MAX_MS = 120_000;

export const VOICE_NOTE_MIN_MS = 300;

export const VOICE_NOTE_MAX_BYTES = 4 * 1024 * 1024;
