import { useEffect, useEffectEvent, useState } from 'react';
import { IS_NATIVE } from '@/shared/constants';
import { useNow } from '@/shared/hooks/use-now';
import { ensurePermission } from '@/shared/libs/permission-prompt';
import {
  HOLD_FAILURE_SHOWN_MS,
  holdTalkFailureOf,
  shownResults,
  useArgusResults,
  useArgusTalk,
  useAssistantChat,
  useVoiceHeard,
} from '@/features/voice';
import type { ArgusResult, ArgusTalk, AssistantChatState, HoldTalkFailure } from '@/features/voice';
import { CHAT_CLOCK_SKEW_MS } from '@/features/conversations/constants/conversation.constant';
import { useArgusSuggestions } from '@/features/conversations/hooks/use-argus-suggestions';
import type { ConversationThread } from '@/features/conversations/hooks/use-conversation-thread';
import { chatOverlay } from '@/features/conversations/model/assistant-chat-overlay';
import type { ChatOverlay } from '@/features/conversations/model/assistant-chat-overlay';
import type { Suggestion } from '@/features/conversations/model/suggestions';
import {
  anchorResults,
  lastReplyOf,
  newestIncomingId,
  shownCameraOf,
} from '@/features/conversations/model/thread-results';
import type { AnchoredResults } from '@/features/conversations/model/thread-results';

export type ArgusThreadState = {
  overlay: ChatOverlay;
  typing: boolean;
  results: readonly ArgusResult[];
  anchored: AnchoredResults;
  newestIn: string | null;
  chat: AssistantChatState;
  talk: ArgusTalk;
  heard: string;
  now: number;
  suggestions: Suggestion[];
  draftVersion: number;
  send: (text: string) => boolean;
  pick: (text: string, send: boolean) => void;
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
  const [draftVersion, setDraftVersion] = useState(0);
  const overlay = chatOverlay({
    messages: thread.messages,
    entries: thread.live ? chat.entries : [],
    leg: IS_NATIVE ? 'phone' : 'laptop',
    skewMs: CHAT_CLOCK_SKEW_MS,
  });
  const suggestions = useArgusSuggestions({
    now,
    shownCamera: shownCameraOf(results),
    lastReply: lastReplyOf(overlay.rows),
  });
  const failure = talk.stage === 'failed' ? holdTalkFailureOf(talk.error) : null;
  const { dismiss } = talk;
  const closeFailure = useEffectEvent(() => dismiss());

  const send = (text: string): boolean => {
    if (!thread.live) thread.toLatest();
    return chat.send(text) === 'sent';
  };

  const pick = (text: string, sendNow: boolean) => {
    if (sendNow) {
      send(text);
      return;
    }
    chat.setDraft(text);
    setDraftVersion((version) => version + 1);
  };

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
    typing: overlay.typing || talk.stage === 'sending',
    results,
    anchored: anchorResults(overlay.rows, results),
    newestIn: newestIncomingId(overlay.rows),
    chat,
    talk,
    heard,
    now,
    suggestions,
    draftVersion,
    send,
    pick,
    failure,
    allowMic,
  };
}
