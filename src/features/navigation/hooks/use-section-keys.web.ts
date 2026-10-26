import { useEffect, useEffectEvent } from 'react';
import { sectionShortcut } from '@/features/navigation/model/section-shortcut';

export function useSectionKeys(
  enabled: boolean,
  count: number,
  onSection: (index: number) => void
): void {
  const fire = useEffectEvent((event: KeyboardEvent) => {
    const index = sectionShortcut(event, count);
    if (index === null) return;
    event.preventDefault();
    onSection(index);
  });
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => fire(event);
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
