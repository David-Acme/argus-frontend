import { useEffect, useEffectEvent } from 'react';
import { ARGUS_COUNTERPART_ID } from '@/core/types';
import { IS_NATIVE } from '@/shared/constants';
import { useNow } from '@/shared/hooks/use-now';
import { ensurePermission } from '@/shared/libs/permission-prompt';
import {
  HOLD_FAILURE_SHOWN_MS,
  holdTalkFailureOf,
  shownResults,
  threadResultsOf,
  useArgusResults,
  useArgusTalk,
  useAssistantChat,
  useVoiceHeard,
} from '@/features/voice';
import type { ArgusResult, ArgusTalk, AssistantChatState, HoldTalkFailure } from '@/features/voice';
import { CHAT_CLOCK_SKEW_MS } from '@/features/conversations/constants/conversation.constant';
import type { ConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { useTyping } from '@/features/conversations/hooks/use-typing';
import { chatOverlay } from '@/features/conversations/model/assistant-chat-overlay';
import type { ChatMark, ChatOverlay } from '@/features/conversations/model/assistant-chat-overlay';
import type { RecordedNote } from '@/features/conversations/model/voice-note';
import {
  anchorResults,
  newestIncomingId,
  resultRowsOf,
} from '@/features/conversations/model/thread-results';
import type { AnchoredResults } from '@/features/conversations/model/thread-results';

export type ArgusThreadState = {
  overlay: ChatOverlay;
  marks: ReadonlyMap<string, ChatMark>;
  typed: ReadonlySet<string>;
  typing: boolean;
  results: readonly ArgusResult[];
  anchored: AnchoredResults;
  newestIn: string | null;
  chat: AssistantChatState;
  talk: ArgusTalk;
  heard: string;
  now: number;
  send: (text: string) => boolean;
  sendNote: (note: RecordedNote) => void;
  retry: (clientId: string) => void;
  dismiss: (clientId: string) => void;
  failure: HoldTalkFailure | null;
  allowMic: () => Promise<void>;
};

const MINUTE_MS = 60_000;

export function useArgusThread(thread: ConversationThread): ArgusThreadState {
  const chat = useAssistantChat(true);
  const results = shownResults(useArgusResults());
  const talk = useArgusTalk();
  const heard = useVoiceHeard();
  const now = useNow(MINUTE_MS);
  const typingState = useTyping();
  const { outbox } = thread;
  const overlay = chatOverlay({
    messages: [...thread.messages, ...outbox.failed],
    entries: thread.live ? chat.entries : [],
    leg: IS_NATIVE ? 'phone' : 'laptop',
    skewMs: CHAT_CLOCK_SKEW_MS,
  });
  const failure = talk.stage === 'failed' ? holdTalkFailureOf(talk.error) : null;
  const { dismiss } = talk;
  const closeFailure = useEffectEvent(() => dismiss());

  const send = (text: string): boolean => {
    if (!thread.live) thread.toLatest();
    return chat.send(text) === 'sent';
  };

  const sendNote = (note: RecordedNote) =>
    void outbox.sendNote(note).then((row) => {
      if (row?.voiceNote) chat.sendNote(row.voiceNote.id, row.body);
    });

  const retryMessage = (clientId: string) =>
    outbox.owns(clientId) ? outbox.retry(clientId) : chat.retry(clientId);

  const dismissMessage = (clientId: string) =>
    outbox.owns(clientId) ? outbox.dismiss(clientId) : chat.dismiss(clientId);

  const allowMic = async () => {
    dismiss();
    await ensurePermission('microphone');
  };

  useEffect(() => {
    if (failure === null || failure === 'permission') return;
    const timer = setTimeout(() => closeFailure(), HOLD_FAILURE_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [failure]);

  return {
    overlay,
    marks: new Map([...overlay.marks, ...outbox.marks]),
    typed: typingState.typed,
    typing: typingState.typing.has(ARGUS_COUNTERPART_ID) || talk.stage === 'sending',
    results,
    anchored: anchorResults(overlay.rows, threadResultsOf(resultRowsOf(overlay.rows), results)),
    newestIn: newestIncomingId(overlay.rows),
    chat,
    talk,
    heard,
    now,
    send,
    sendNote,
    retry: retryMessage,
    dismiss: dismissMessage,
    failure,
    allowMic,
  };
}
