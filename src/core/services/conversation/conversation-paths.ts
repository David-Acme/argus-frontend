export const CONVERSATION_PATH = '/conversation';

export const validCounterpartId = (value: unknown): number | null => {
  const id = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof id === 'number' && Number.isSafeInteger(id) && id >= 0 ? id : null;
};

export const conversationThreadPath = (counterpartId: number): string =>
  `${CONVERSATION_PATH}/${encodeURIComponent(String(counterpartId))}`;

export const conversationReadPath = (counterpartId: number): string => `${conversationThreadPath(counterpartId)}/read`;
