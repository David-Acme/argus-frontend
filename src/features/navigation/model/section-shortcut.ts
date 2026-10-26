export type ShortcutTarget = {
  tagName?: string;
  isContentEditable?: boolean;
};

export type ShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented?: boolean;
  isComposing?: boolean;
  target: unknown;
};

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function typingIn(target: unknown): boolean {
  if (typeof target !== 'object' || target === null) return false;
  const { tagName, isContentEditable } = target as ShortcutTarget;
  return Boolean(isContentEditable) || TYPING_TAGS.has(tagName?.toUpperCase() ?? '');
}

export function sectionShortcut(event: ShortcutEvent, count: number): number | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (event.defaultPrevented || event.isComposing || typingIn(event.target)) return null;
  if (!/^[1-9]$/.test(event.key)) return null;
  const index = Number(event.key) - 1;
  return index < count ? index : null;
}
