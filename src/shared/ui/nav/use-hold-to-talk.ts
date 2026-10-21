import { useRef, useState } from 'react';
import type { GestureResponderEvent, View } from 'react-native';
import { feedback } from '@/shared/theme';
import type { NavVoice } from './nav-types';

export type ListenMode = 'off' | 'hold' | 'toggle';

type Rect = { x: number; y: number; width: number; height: number };

export const HOLD_DELAY = 220;

export const SLIDE_SLOP = 24;

export function inside(rect: Rect | null, x: number, y: number): boolean {
  if (!rect) return true;
  return (
    x >= rect.x - SLIDE_SLOP &&
    x <= rect.x + rect.width + SLIDE_SLOP &&
    y >= rect.y - SLIDE_SLOP &&
    y <= rect.y + rect.height + SLIDE_SLOP
  );
}

export function useHoldToTalk(voice: NavVoice) {
  const [mode, setModeState] = useState<ListenMode>('off');
  const current = useRef<ListenMode>('off');
  const setMode = (next: ListenMode) => {
    current.current = next;
    setModeState(next);
  };
  const target = useRef<View>(null);

  const rect = useRef<Rect | null>(null);
  const start = (next: ListenMode) => {
    feedback('impactLight');
    setMode(next);
    voice.onListenStart();
  };
  const stop = (send: boolean) => {
    feedback('impactLight');
    setMode('off');
    voice.onListenEnd(send);
  };
  const handlers = {
    onPressIn: () => {
      target.current?.measureInWindow((...box: number[]) => {
        const [x = 0, y = 0, width = 0, height = 0] = box;
        rect.current = { x, y, width, height };
      });
    },
    onLongPress: () => start('hold'),
    onPressOut: (event: GestureResponderEvent) => {
      if (current.current !== 'hold') return;
      stop(inside(rect.current, event.nativeEvent.pageX, event.nativeEvent.pageY));
    },
    onPress: () => {
      if (current.current === 'toggle') stop(true);
      else if (current.current === 'off') voice.onOpenChat();
    },
    onAccessibilityAction: () => (current.current === 'off' ? start('toggle') : stop(true)),
  };
  return { mode, target, handlers };
}
