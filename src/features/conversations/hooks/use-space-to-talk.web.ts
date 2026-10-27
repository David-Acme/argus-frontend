import { useEffect, useEffectEvent, useRef } from 'react';
import { useArgusTalk } from '@/features/voice';
import { endsSpaceTalk, startsSpaceTalk } from '@/features/conversations/model/space-talk';
import type { SpaceKey } from '@/features/conversations/model/space-talk';

const EDITABLE = 'input, textarea, select, [contenteditable="true"]';

const editing = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(EDITABLE) !== null;

const spaceKeyOf = (event: KeyboardEvent): SpaceKey => ({
  key: event.key,
  repeat: event.repeat,
  ctrlKey: event.ctrlKey,
  metaKey: event.metaKey,
  altKey: event.altKey,
  editing: editing(event.target),
});

export function useSpaceToTalk(enabled: boolean): void {
  const talk = useArgusTalk();
  const holding = useRef(false);
  const down = useEffectEvent((event: KeyboardEvent) => {
    if (!talk.canListen || !startsSpaceTalk(spaceKeyOf(event))) return;
    event.preventDefault();
    holding.current = true;
    talk.start();
  });
  const up = useEffectEvent((event: KeyboardEvent) => {
    if (!endsSpaceTalk(event, holding.current)) return;
    event.preventDefault();
    holding.current = false;
    talk.finish(true);
  });
  useEffect(() => {
    if (!enabled) return;
    const onDown = (event: KeyboardEvent) => down(event);
    const onUp = (event: KeyboardEvent) => up(event);
    globalThis.addEventListener('keydown', onDown);
    globalThis.addEventListener('keyup', onUp);
    return () => {
      globalThis.removeEventListener('keydown', onDown);
      globalThis.removeEventListener('keyup', onUp);
    };
  }, [enabled]);
}
