import { useEffect, useEffectEvent, useRef } from 'react';
import {
  TYPING_IDLE_MS,
  TYPING_REFRESH_MS,
} from '@/features/conversations/constants/typing.constant';
import { sendTyping } from '@/features/conversations/services/typing';
import { nextTypingSignal, TYPING_SIGNAL_IDLE } from '@/features/conversations/model/typing-signal';
import type { TypingSignalEvent } from '@/features/conversations/model/typing-signal';

export type TypingSignal = { onDraft: (draft: string) => void; stop: () => void };

export function useTypingSignal(counterpartId: number, enabled: boolean): TypingSignal {
  const state = useRef(TYPING_SIGNAL_IDLE);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = (event: TypingSignalEvent) => {
    if (!enabled) return;
    const next = nextTypingSignal({
      state: state.current,
      event,
      now: Date.now(),
      refreshMs: TYPING_REFRESH_MS,
    });
    state.current = next.state;
    if (next.emit !== null) sendTyping(counterpartId, next.emit);
  };

  const clearIdle = () => {
    if (idle.current !== null) clearTimeout(idle.current);
    idle.current = null;
  };

  const stop = () => {
    clearIdle();
    step('cleared');
  };

  const onDraft = (draft: string) => {
    clearIdle();
    if (draft.trim().length === 0) {
      step('cleared');
      return;
    }
    step('typed');
    idle.current = setTimeout(() => step('idle'), TYPING_IDLE_MS);
  };

  const leave = useEffectEvent(stop);

  useEffect(() => () => leave(), []);

  return { onDraft, stop };
}
