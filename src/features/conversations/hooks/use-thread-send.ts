import { useState } from 'react';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { conversationService } from '@/core/services/conversation.service';
import type { ConversationMessage } from '@/core/types';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import { typedMessageIntent } from '@/features/conversations/model/conversation-optimistic';
import {
  failedMarks,
  failedRowOf,
  FAILED_SEND_ERROR,
} from '@/features/conversations/model/failed-sends';
import type { FailedSend } from '@/features/conversations/model/failed-sends';
import { noteFileOf } from '@/features/conversations/model/voice-note';
import type { RecordedNote } from '@/features/conversations/model/voice-note';

export type ThreadSendInput = { counterpartId: number; name: string; beforeSend: () => void };

export type ThreadSend = {
  failed: readonly IConversationMessageCacheRow[];
  marks: ReadonlyMap<string, ChatMark>;
  send: (body: string) => Promise<boolean>;
  sendNote: (note: RecordedNote) => Promise<ConversationMessage | null>;
  owns: (id: string) => boolean;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
};

let failures = 0;

const failureId = (): string => {
  failures += 1;
  return `failed:${Date.now()}:${failures}`;
};

export function useThreadSend({ counterpartId, name, beforeSend }: ThreadSendInput): ThreadSend {
  const [failed, setFailed] = useState<readonly FailedSend[]>([]);

  const remember = (send: Omit<FailedSend, 'id'>) =>
    setFailed((current) => [...current, { ...send, id: failureId() }]);

  const deliver = async (
    body: string,
    note: RecordedNote | null
  ): Promise<ConversationMessage | null> => {
    beforeSend();
    const createdAt = Date.now();
    const voiceNote = note
      ? { id: '', mime: note.mime, durationMs: note.durationMs, peaks: note.peaks }
      : null;
    const result = await runOptimistic({
      intents: [
        typedMessageIntent({ counterpartId, counterpartName: name, body, createdAt, voiceNote }),
      ],
      call: () =>
        note
          ? conversationService.sendVoiceNote(counterpartId, noteFileOf(note))
          : conversationService.send(counterpartId, body),
      quiet: true,
      onRefused: () => remember({ body, note, createdAt }),
    });
    return result?.info ?? null;
  };

  const retry = (id: string) => {
    const failure = failed.find((candidate) => candidate.id === id);
    if (!failure) return;
    setFailed((current) => current.filter((candidate) => candidate.id !== id));
    void deliver(failure.body, failure.note);
  };

  const dismiss = (id: string) =>
    setFailed((current) => current.filter((candidate) => candidate.id !== id));

  return {
    failed: failed.map((failure) => failedRowOf(failure, counterpartId)),
    marks: failedMarks(failed, FAILED_SEND_ERROR),
    send: async (body) => (await deliver(body, null)) !== null,
    sendNote: (note) => deliver('', note),
    owns: (id) => failed.some((failure) => failure.id === id),
    retry,
    dismiss,
  };
}
