import { useEffect, useState } from 'react';

const QUERY = '(prefers-contrast: more)';

const media = (): MediaQueryList | null =>
  typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia(QUERY) : null;

export function useIncreaseContrast(): boolean {
  const [more, setMore] = useState(() => media()?.matches ?? false);
  useEffect(() => {
    const list = media();
    if (!list) return;
    const listen = (event: MediaQueryListEvent) => setMore(event.matches);
    list.addEventListener('change', listen);
    return () => list.removeEventListener('change', listen);
  }, []);
  return more;
}
