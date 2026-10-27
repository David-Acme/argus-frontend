import { useEffect, useSyncExternalStore } from 'react';
import { bindTyping, typingTracker } from '@/features/conversations/services/typing';
import type { TypingSnapshot } from '@/features/conversations/services/typing/typing-tracker';

const subscribe = (listener: () => void): (() => void) => typingTracker.subscribe(listener);

const getSnapshot = (): TypingSnapshot => typingTracker.snapshot;

export function useTyping(): TypingSnapshot {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    bindTyping();
  }, []);

  return snapshot;
}
