import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { ARGUS_COUNTERPART_ID } from '@/core/types';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import type { RecordedNote } from '@/features/conversations/model/voice-note';

export type FailedSend = { id: string; body: string; note: RecordedNote | null; createdAt: number };

export const FAILED_SEND_ERROR = 'SEND_FAILED|The message did not reach Argus';

export function failedRowOf(
  failure: FailedSend,
  counterpartId: number
): IConversationMessageCacheRow {
  const { note } = failure;
  return {
    id: failure.id,
    counterpartId,
    counterpartName: '',
    direction: 'out',
    kind: counterpartId === ARGUS_COUNTERPART_ID ? 'turn' : 'relay',
    body: failure.body,
    leg: null,
    state: 'sent',
    messageKey: '',
    replyToKey: null,
    result: null,
    via: note ? 'voice' : null,
    receipt: null,
    voiceNote: note
      ? { id: '', mime: note.mime, durationMs: note.durationMs, peaks: note.peaks }
      : null,
    isRead: true,
    createdAt: failure.createdAt,
  };
}

export function failedMarks(
  failures: readonly FailedSend[],
  error: string
): ReadonlyMap<string, ChatMark> {
  return new Map(
    failures.map((failure) => [failure.id, { clientId: failure.id, status: 'failed', error }])
  );
}
