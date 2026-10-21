export type SystemFlag = 'reduceMotion' | 'reduceTransparency';

const QUERIES: Record<SystemFlag, string> = {
  reduceMotion: '(prefers-reduced-motion: reduce)',
  reduceTransparency: '(prefers-reduced-transparency: reduce)',
};

function media(flag: SystemFlag): MediaQueryList | null {
  return typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia(QUERIES[flag]) : null;
}

export function readSystemFlag(flag: SystemFlag): Promise<boolean> {
  return Promise.resolve(media(flag)?.matches ?? false);
}

export function watchSystemFlag(
  flag: SystemFlag,
  onChange: (enabled: boolean) => void
): () => void {
  const list = media(flag);
  if (!list) return () => undefined;
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  list.addEventListener('change', listener);
  return () => list.removeEventListener('change', listener);
}
